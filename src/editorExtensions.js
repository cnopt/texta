import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { EditorSelection, EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'
import {
  CALLOUT_PREFIX,
  HEADING_FORMATS,
  INFO_PREFIX,
  TALLY_PREFIX,
  TODO_CANCELLED_PREFIX,
  TODO_COMPLETE_PREFIX,
  TODO_PREFIX,
  parseInlineFormats,
  parseTallyValue,
  setTallyValue,
  deleteTallyLine,
  getTallyLineBefore,
  toggleTodoCancelled,
  toggleTodoComplete,
} from './inlineFormat.js'
import { collectLineTagMatches } from './customTags.js'
import { getTagStyleString } from './tagStyles.js'

const isAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/** Matches the fixed mobile formatting bar footprint in FloatingBar.css / Editor.css. */
export const MOBILE_FLOATING_BAR_INSET = 40

function lightHaptic() {
  if (!Capacitor.isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

let pendingAndroidScrollFrame = 0

// Bottom overlay (floating bar) that covers the editor scroller. scrollIntoView
// and Android caret checks must treat this as outside the visible area.
let editorBottomScrollInset = 0

export function setEditorBottomScrollInset(px) {
  editorBottomScrollInset = Math.max(0, px)
}

export function editorScrollMargins() {
  return EditorView.scrollMargins.of(() => ({
    bottom: editorBottomScrollInset,
  }))
}

function isCursorVisible(view, head) {
  const coords = view.coordsAtPos(head)
  if (!coords) return true

  const bounds = view.scrollDOM.getBoundingClientRect()
  return (
    coords.top >= bounds.top - 4 &&
    coords.bottom <= bounds.bottom - editorBottomScrollInset + 4
  )
}

function scheduleAndroidCursorScroll(view) {
  cancelAnimationFrame(pendingAndroidScrollFrame)
  pendingAndroidScrollFrame = requestAnimationFrame(() => {
    pendingAndroidScrollFrame = requestAnimationFrame(() => {
      if (!view.hasFocus) return

      const head = view.state.selection.main.head
      if (isCursorVisible(view, head)) return

      view.dispatch({
        effects: EditorView.scrollIntoView(head, { y: 'nearest' }),
      })
    })
  })
}

/**
 * Chrome Android can reset the editor scroller to the top when focus moves
 * into the contenteditable or when the keyboard resizes the viewport.
 */
export function androidEditorSupport() {
  if (!isAndroid) return []

  return [
    EditorView.updateListener.of((update) => {
      if (!update.view.hasFocus) return
      if (
        !update.docChanged &&
        !update.selectionSet &&
        !(update.focusChanged && update.view.hasFocus)
      ) {
        return
      }

      scheduleAndroidCursorScroll(update.view)
    }),
  ]
}

/** Append a newline when document text ends on a tally line. */
export function withTallyTrailingLine(text) {
  if (!text) return text

  const lastNewline = text.lastIndexOf('\n')
  const lastLine = lastNewline === -1 ? text : text.slice(lastNewline + 1)
  if (!lastLine.startsWith(TALLY_PREFIX)) return text
  return `${text}\n`
}

/**
 * Tally lines are fully replaced by a widget, so the doc must not end on one
 * or there is nowhere to put the caret / type. Re-insert a trailing empty
 * line whenever an edit would leave a tally as the last line.
 */
export function ensureTallyTrailingLine() {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr

    const doc = tr.newDoc
    const lastLine = doc.line(doc.lines)
    if (!lastLine.text.startsWith(TALLY_PREFIX)) return tr

    const insertAt = doc.length
    const main = tr.newSelection.main
    const caretOnTally = main.from >= lastLine.from && main.to <= lastLine.to

    return [
      tr,
      {
        changes: { from: insertAt, insert: '\n' },
        selection: caretOnTally
          ? EditorSelection.cursor(insertAt + 1)
          : undefined,
        sequential: true,
      },
    ]
  })
}

/** Document position of the selected tally line start, or null. */
export const setSelectedTally = StateEffect.define()

export const selectedTallyField = StateField.define({
  create() {
    return null
  },
  update(value, tr) {
    let next = value
    let explicitlySet = false

    for (const effect of tr.effects) {
      if (effect.is(setSelectedTally)) {
        next = effect.value
        explicitlySet = true
      }
    }

    if (next == null) return null

    if (tr.docChanged) {
      next = tr.changes.mapPos(next, 1)
    }

    const line = tr.newDoc.lineAt(next)
    if (!isTallyLine(line.text)) return null
    next = line.from

    if (!explicitlySet && tr.selection) {
      const after = line.to < tr.newDoc.length ? line.to + 1 : line.to
      if (tr.newSelection.main.head !== after) return null
    }

    return next
  },
})

function caretAfterTally(doc, line) {
  return line.to < doc.length ? line.to + 1 : line.to
}

/** Collapses Backspace keydown + IME delete.backward from the same press. */
let tallyBackspaceLock = false

function armTallyBackspaceLock() {
  tallyBackspaceLock = true
  setTimeout(() => {
    tallyBackspaceLock = false
  }, 50)
}

function selectTallyAt(view, lineFrom) {
  const line = view.state.doc.lineAt(lineFrom)
  const caret = caretAfterTally(view.state.doc, line)
  armTallyBackspaceLock()
  lightHaptic()
  view.dispatch({
    ...(view.state.selection.main.head === caret
      ? {}
      : { selection: EditorSelection.cursor(caret) }),
    effects: setSelectedTally.of(line.from),
    scrollIntoView: true,
  })
}

function removeTallyAt(view, lineFrom) {
  const doc = view.state.doc.toString()
  const result = deleteTallyLine(doc, lineFrom)
  if (!result) return false

  armTallyBackspaceLock()
  lightHaptic()
  view.dispatch({
    changes: toMinimalChange(doc, result.text),
    selection: EditorSelection.cursor(result.selectionStart),
    effects: setSelectedTally.of(null),
    scrollIntoView: true,
  })
  return true
}

/**
 * Backspace on the line after a tally selects it; a second backspace deletes it.
 * Returns true when the keypress was handled.
 */
export function handleTallyBackspace(view) {
  if (tallyBackspaceLock) return true

  const { from, to } = view.state.selection.main
  if (from !== to) return false

  const doc = view.state.doc.toString()
  const tallyFrom = getTallyLineBefore(doc, from)
  if (tallyFrom == null) return false

  if (view.state.field(selectedTallyField) === tallyFrom) {
    return removeTallyAt(view, tallyFrom)
  }

  selectTallyAt(view, tallyFrom)
  return true
}

/**
 * Android IME may delete the newline after a tally without firing the Backspace
 * keymap. Convert that edit into select-or-delete instead of merging into the widget.
 */
export function interceptTallyBackspace() {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent('delete.backward')) return tr

    if (tallyBackspaceLock) {
      return { selection: tr.startState.selection }
    }

    const sel = tr.startState.selection.main
    if (sel.from !== sel.to) return tr

    const doc = tr.startState.doc.toString()
    const tallyFrom = getTallyLineBefore(doc, sel.from)
    if (tallyFrom == null) return tr

    armTallyBackspaceLock()
    lightHaptic()

    if (tr.startState.field(selectedTallyField) === tallyFrom) {
      const result = deleteTallyLine(doc, tallyFrom)
      if (!result) return tr
      return {
        changes: toMinimalChange(doc, result.text),
        selection: EditorSelection.cursor(result.selectionStart),
        effects: setSelectedTally.of(null),
      }
    }

    return {
      effects: setSelectedTally.of(tallyFrom),
      selection: EditorSelection.cursor(sel.from),
    }
  })
}

const FORMAT_CLASS_NAMES = {
  bold: 'cm-inline-bold',
  italic: 'cm-inline-italic',
  underline: 'cm-inline-underline',
  h1: 'cm-inline-h1',
  h2: 'cm-inline-h2',
  h3: 'cm-inline-h3',
}

const MARKER_DECORATION = Decoration.mark({ class: 'cm-format-marker' })
const HIDDEN_MARKER_DECORATION = Decoration.replace({})
const TODO_LINE_DECORATION = Decoration.line({ class: 'cm-todo' })
const TODO_COMPLETE_LINE_DECORATION = Decoration.line({ class: 'cm-todo-complete' })
const TODO_CANCELLED_LINE_DECORATION = Decoration.line({ class: 'cm-todo-cancelled' })
const CALLOUT_LINE_DECORATION = Decoration.line({ class: 'cm-callout' })
const INFO_LINE_DECORATION = Decoration.line({ class: 'cm-info' })
const TALLY_LINE_DECORATION = Decoration.line({ class: 'cm-tally' })
const TALLY_SELECTED_LINE_DECORATION = Decoration.line({ class: 'cm-tally-selected' })
const TODO_PREFIX_LENGTH = TODO_PREFIX.length
const TODO_COMPLETE_PREFIX_LENGTH = TODO_COMPLETE_PREFIX.length
const TODO_CANCELLED_PREFIX_LENGTH = TODO_CANCELLED_PREFIX.length
const TODO_CHECKBOX_LENGTH = 1
const CALLOUT_PREFIX_LENGTH = CALLOUT_PREFIX.length
const INFO_PREFIX_LENGTH = INFO_PREFIX.length
const TALLY_PREFIX_LENGTH = TALLY_PREFIX.length
const TODO_LONG_PRESS_MS = 500
const TALLY_LONG_PRESS_MS = 500

/** Survives widget re-mounts so pointerup after a long-press does not complete the item. */
let suppressedTodoTapPointerId = null

const INFO_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b8cb0' stroke-width='2.5' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 11v5'/%3E%3Ccircle cx='12' cy='8' r='1' fill='%236b8cb0' stroke='none'/%3E%3C/svg%3E")`

function toMinimalChange(previous, next) {
  const maxPrefix = Math.min(previous.length, next.length)
  let from = 0

  while (from < maxPrefix && previous[from] === next[from]) {
    from += 1
  }

  let previousEnd = previous.length
  let nextEnd = next.length

  while (
    previousEnd > from &&
    nextEnd > from &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd -= 1
    nextEnd -= 1
  }

  return { from, to: previousEnd, insert: next.slice(from, nextEnd) }
}

class TodoPrefixWidget extends WidgetType {
  constructor(state, lineFrom) {
    super()
    this.state = state
    this.lineFrom = lineFrom
  }

  eq(other) {
    return (
      other instanceof TodoPrefixWidget &&
      other.state === this.state &&
      other.lineFrom === this.lineFrom
    )
  }

  toDOM(view) {
    const widget = this
    const span = document.createElement('span')
    span.className = `cm-todo-prefix cm-todo-prefix-${this.state}`
    span.textContent =
      this.state === 'complete'
        ? '\u2713'
        : this.state === 'cancelled'
          ? '\u2715'
          : '\u2610'
    span.setAttribute('aria-hidden', 'true')

    let longPressTimer = null
    let longPressTriggered = false

    function clearLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    function dispatchToggle(fn) {
      const { state } = view
      const line = state.doc.lineAt(widget.lineFrom)
      const doc = state.doc.toString()
      const result = fn(doc, line.from, line.to)

      view.dispatch({
        changes: toMinimalChange(doc, result.text),
      })
    }

    span.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      longPressTriggered = false

      if (isAndroid && (widget.state === 'incomplete' || widget.state === 'cancelled')) {
        const pointerId = event.pointerId
        longPressTimer = setTimeout(() => {
          longPressTriggered = true
          suppressedTodoTapPointerId = pointerId
          dispatchToggle(toggleTodoCancelled)
        }, TODO_LONG_PRESS_MS)
        return
      }

      if (!isAndroid && widget.state !== 'cancelled') {
        dispatchToggle(toggleTodoComplete)
      }
    })

    span.addEventListener('pointerup', (event) => {
      event.preventDefault()
      event.stopPropagation()
      clearLongPress()

      if (!isAndroid) return

      if (
        longPressTriggered ||
        event.pointerId === suppressedTodoTapPointerId
      ) {
        if (event.pointerId === suppressedTodoTapPointerId) {
          suppressedTodoTapPointerId = null
        }
        return
      }

      if (widget.state === 'cancelled') return

      dispatchToggle(toggleTodoComplete)
    })

    span.addEventListener('pointercancel', (event) => {
      clearLongPress()
      if (event.pointerId === suppressedTodoTapPointerId) {
        suppressedTodoTapPointerId = null
      }
    })
    span.addEventListener('pointerleave', clearLongPress)

    return span
  }

  ignoreEvent() {
    return true
  }
}

function getLineIndentLength(lineText) {
  let i = 0
  while (i < lineText.length && lineText[i] === '\t') i += 1
  return i
}

function lineBody(lineText) {
  return lineText.slice(getLineIndentLength(lineText))
}

function isCompleteTodoLine(lineText) {
  return lineBody(lineText).startsWith(TODO_COMPLETE_PREFIX)
}

function isCancelledTodoLine(lineText) {
  return lineBody(lineText).startsWith(TODO_CANCELLED_PREFIX)
}

function isTodoLine(lineText) {
  const body = lineBody(lineText)
  return (
    body.startsWith(TODO_PREFIX) ||
    body.startsWith(TODO_COMPLETE_PREFIX) ||
    body.startsWith(TODO_CANCELLED_PREFIX)
  )
}

function isCalloutLine(lineText) {
  return lineBody(lineText).startsWith(CALLOUT_PREFIX)
}

function isInfoLine(lineText) {
  return lineBody(lineText).startsWith(INFO_PREFIX)
}

function isTallyLine(lineText) {
  return lineBody(lineText).startsWith(TALLY_PREFIX)
}

class TallyWidget extends WidgetType {
  constructor(value, lineFrom, selected) {
    super()
    this.value = value
    this.lineFrom = lineFrom
    this.selected = selected
  }

  eq(other) {
    return (
      other instanceof TallyWidget &&
      other.value === this.value &&
      other.lineFrom === this.lineFrom &&
      other.selected === this.selected
    )
  }

  toDOM(view) {
    const widget = this
    const root = document.createElement('span')
    root.className = 'cm-tally-widget'
    root.setAttribute('contenteditable', 'false')

    const minus = document.createElement('button')
    minus.type = 'button'
    minus.className = 'cm-tally-button cm-tally-minus'
    minus.setAttribute('aria-label', 'Decrement tally')
    minus.textContent = '\u2212'

    const value = document.createElement('span')
    value.className = 'cm-tally-value'
    value.textContent = String(this.value)

    const plus = document.createElement('button')
    plus.type = 'button'
    plus.className = 'cm-tally-button cm-tally-plus'
    plus.setAttribute('aria-label', 'Increment tally')
    plus.textContent = '+'

    function adjust(delta) {
      const { state } = view
      const line = state.doc.lineAt(widget.lineFrom)
      const doc = state.doc.toString()
      const current = parseTallyValue(line.text)
      const nextValue = Math.max(0, current + delta)
      if (nextValue === current) return

      const result = setTallyValue(doc, line.from, nextValue)
      if (!result) return

      lightHaptic()
      view.dispatch({
        changes: toMinimalChange(doc, result.text),
      })
    }

    function onButtonPointerDown(event) {
      event.preventDefault()
      event.stopPropagation()
    }

    minus.addEventListener('pointerdown', onButtonPointerDown)
    plus.addEventListener('pointerdown', onButtonPointerDown)
    minus.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      adjust(-1)
    })
    plus.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      adjust(1)
    })

    if (this.selected) {
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'cm-tally-button cm-tally-delete'
      remove.setAttribute('aria-label', 'Delete tally')
      remove.textContent = '\u00d7'
      remove.addEventListener('pointerdown', onButtonPointerDown)
      remove.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const line = view.state.doc.lineAt(widget.lineFrom)
        removeTallyAt(view, line.from)
      })
      root.append(minus, value, remove)
    } else {
      let longPressTimer = null

      function clearLongPress() {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }

      value.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        longPressTimer = setTimeout(() => {
          const line = view.state.doc.lineAt(widget.lineFrom)
          selectTallyAt(view, line.from)
        }, TALLY_LONG_PRESS_MS)
      })
      value.addEventListener('pointerup', (event) => {
        event.preventDefault()
        event.stopPropagation()
        clearLongPress()
      })
      value.addEventListener('pointercancel', clearLongPress)
      value.addEventListener('pointerleave', clearLongPress)
      value.addEventListener('contextmenu', (event) => {
        event.preventDefault()
      })
      root.append(minus, value, plus)
    }

    return root
  }

  ignoreEvent() {
    return true
  }
}

function showTallyWidget(line, showMarkers, decorations, hidden, selected) {
  if (showMarkers) {
    hideLinePrefix(line, TALLY_PREFIX_LENGTH, true, decorations, hidden)
    return
  }

  const value = parseTallyValue(line.text)
  const range = Decoration.replace({
    widget: new TallyWidget(value, line.from, selected),
  }).range(line.from, line.to)
  decorations.push(range)
  hidden.push(range)
}

function hideLinePrefix(line, prefixLength, showMarkers, decorations, hidden) {
  const indentLength = getLineIndentLength(line.text)
  const prefixFrom = line.from + indentLength
  const prefixTo = prefixFrom + prefixLength

  if (showMarkers) {
    decorations.push(MARKER_DECORATION.range(prefixFrom, prefixTo))
    return
  }

  const range = HIDDEN_MARKER_DECORATION.range(prefixFrom, prefixTo)
  decorations.push(range)
  hidden.push(range)
}

function showTodoPrefix(line, state, showMarkers, decorations, hidden) {
  const prefixLength =
    state === 'complete'
      ? TODO_COMPLETE_PREFIX_LENGTH
      : state === 'cancelled'
        ? TODO_CANCELLED_PREFIX_LENGTH
        : TODO_PREFIX_LENGTH
  const indentLength = getLineIndentLength(line.text)
  const prefixFrom = line.from + indentLength
  const prefixTo = prefixFrom + prefixLength

  if (showMarkers) {
    decorations.push(MARKER_DECORATION.range(prefixFrom, prefixTo))
    return
  }

  // Replace only the checkbox glyph so the trailing space stays in the
  // document. That keeps icon→text spacing natural and stable when toggling.
  const range = Decoration.replace({
    widget: new TodoPrefixWidget(state, line.from),
  }).range(prefixFrom, prefixFrom + TODO_CHECKBOX_LENGTH)
  decorations.push(range)
  hidden.push(range)
}

function getFormatClassName(segment) {
  const classNames = []
  const heading = HEADING_FORMATS.find((format) => segment[format])

  if (heading) classNames.push(FORMAT_CLASS_NAMES[heading])
  if (segment.bold) classNames.push(FORMAT_CLASS_NAMES.bold)
  if (segment.italic) classNames.push(FORMAT_CLASS_NAMES.italic)
  if (segment.underline) classNames.push(FORMAT_CLASS_NAMES.underline)

  return classNames.join(' ')
}

/**
 * Formats never span a line break, so each line is parsed independently.
 */
function collectLineDecorations(
  line,
  customTags,
  showMarkers,
  decorations,
  hidden,
  selectedTallyFrom,
) {
  if (!line.length) return

  if (isCompleteTodoLine(line.text)) {
    decorations.push(TODO_COMPLETE_LINE_DECORATION.range(line.from))
    showTodoPrefix(line, 'complete', showMarkers, decorations, hidden)
  } else if (isCancelledTodoLine(line.text)) {
    decorations.push(TODO_CANCELLED_LINE_DECORATION.range(line.from))
    showTodoPrefix(line, 'cancelled', showMarkers, decorations, hidden)
  } else if (isTodoLine(line.text)) {
    decorations.push(TODO_LINE_DECORATION.range(line.from))
    showTodoPrefix(line, 'incomplete', showMarkers, decorations, hidden)
  }

  if (isCalloutLine(line.text)) {
    decorations.push(CALLOUT_LINE_DECORATION.range(line.from))
    hideLinePrefix(line, CALLOUT_PREFIX_LENGTH, showMarkers, decorations, hidden)
  }

  if (isInfoLine(line.text)) {
    decorations.push(INFO_LINE_DECORATION.range(line.from))
    hideLinePrefix(line, INFO_PREFIX_LENGTH, showMarkers, decorations, hidden)
  }

  if (isTallyLine(line.text)) {
    const selected = selectedTallyFrom === line.from
    decorations.push(TALLY_LINE_DECORATION.range(line.from))
    if (selected) {
      decorations.push(TALLY_SELECTED_LINE_DECORATION.range(line.from))
    }
    showTallyWidget(line, showMarkers, decorations, hidden, selected)
    // The widget owns the full line; skip tag/inline decorations that would overlap.
    if (!showMarkers) return
  }

  for (const tagMatch of collectLineTagMatches(line.text, customTags)) {
    const style = getTagStyleString(tagMatch.tag)
    if (!style) continue

    decorations.push(
      Decoration.mark({ attributes: { style } }).range(
        line.from + tagMatch.from,
        line.from + tagMatch.to,
      ),
    )
  }

  for (const segment of parseInlineFormats(line.text)) {
    const from = line.from + segment.start
    const to = line.from + segment.end

    if (segment.type === 'marker') {
      if (showMarkers) {
        decorations.push(MARKER_DECORATION.range(from, to))
      } else {
        const range = HIDDEN_MARKER_DECORATION.range(from, to)
        decorations.push(range)
        hidden.push(range)
      }
      continue
    }

    const className = getFormatClassName(segment)
    if (className) {
      decorations.push(Decoration.mark({ class: className }).range(from, to))
    }
  }
}

function buildDecorations(view, customTags, showMarkers) {
  const decorations = []
  const hidden = []
  const selectedTallyFrom = view.state.field(selectedTallyField, false)

  for (const { from, to } of view.visibleRanges) {
    let pos = from

    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      collectLineDecorations(
        line,
        customTags,
        showMarkers,
        decorations,
        hidden,
        selectedTallyFrom,
      )
      pos = line.to + 1
    }
  }

  return {
    decorations: Decoration.set(decorations, true),
    hidden: Decoration.set(hidden, true),
  }
}

/**
 * Styles inline formats and custom tags, and hides the raw markers.
 *
 * Only the hidden marker ranges are exposed as atomic ranges, so the caret
 * steps over them in one press without treating formatted text as an atom.
 */
export function formattingDecorations(customTags, showMarkers) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.build(view)
      }

      update(update) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.state.field(selectedTallyField, false) !==
            update.startState.field(selectedTallyField, false)
        ) {
          this.build(update.view)
        }
      }

      build(view) {
        const built = buildDecorations(view, customTags, showMarkers)
        this.decorations = built.decorations
        this.hidden = built.hidden
      }
    },
    {
      decorations: (instance) => instance.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of(
          (view) => view.plugin(plugin)?.hidden ?? Decoration.none,
        ),
    },
  )
}

export function createEditorTheme({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  textAlign = 'left',
  todoSpacing = false,
  colorScheme = 'dark',
}) {
  const isPaper = colorScheme === 'paper'
  const isLight = colorScheme === 'light' || isPaper
  const textColor = isPaper ? '#3d3424' : isLight ? '#1c1c1c' : '#ebebeb'
  const placeholderColor = isPaper ? '#8a7b62' : isLight ? '#8a8a8a' : '#9a9a9a'
  const infoBackground = isPaper ? '#e4d6b0' : isLight ? '#e4eaf2' : '#1a2744'
  const infoColor = isPaper ? '#4d5c52' : isLight ? '#4a6a8c' : '#6b8cb0'
  const tallyValueColor = isPaper ? '#3f5348' : isLight ? '#3d5a7a' : '#8eafd0'
  const tallyButtonBackground = isPaper
    ? 'rgba(77, 92, 82, 0.14)'
    : isLight
      ? 'rgba(74, 106, 140, 0.12)'
      : 'rgba(107, 140, 176, 0.16)'
  const tallyButtonActiveBackground = isPaper
    ? 'rgba(77, 92, 82, 0.24)'
    : isLight
      ? 'rgba(74, 106, 140, 0.22)'
      : 'rgba(107, 140, 176, 0.28)'
  const tallyButtonActiveColor = isPaper ? '#2f4038' : isLight ? '#2f4a68' : '#b7d0e8'
  const selectionBackground = isLight
    ? 'rgba(55, 122, 255, 0.28)'
    : 'rgba(55, 122, 255, 0.35)'

  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'transparent',
        color: textColor,
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-scroller': {
        fontFamily,
        fontSize,
        lineHeight,
        letterSpacing,
        fontWeight: '500',
        overflow: 'auto',
      },
      '.cm-content': {
        padding: '0 0 1.5rem',
        caretColor: textColor,
      },
      '.cm-line': {
        padding: '0',
        textAlign,
      },
      '.cm-line.cm-todo, .cm-line.cm-todo-complete, .cm-line.cm-todo-cancelled': {
        paddingLeft: todoSpacing ? '0.2em' : '0',
      },
      '.cm-line.cm-todo-complete': {
        // color: '#5dce7a',
        color: '#7bab44'
      },
      '.cm-line.cm-todo-cancelled': {
        // color: '#e05555',
        color: '#bd514a'
      },
      '.cm-todo-prefix': {
        display: 'inline-block',
        width: '1em',
        textAlign: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'manipulation',
      },
      '.cm-todo-prefix-complete': {
        // color: '#5dce7a',
        color: '#7bab44'
      },
      '.cm-todo-prefix-cancelled': {
        // color: '#e05555',
        color: '#bd514a'
      },
      '.cm-line.cm-callout': {
        borderLeft: '4px solid rgb(210, 140, 79)',
        margin: '6px 12px',
        padding: '8px 12px 8px 28px',
        color: '#e09040',
      },
      '.cm-line.cm-info': {
        position: 'relative',
        backgroundColor: infoBackground,
        color: infoColor,
        margin: '6px 12px',
        padding: '8px 12px 8px 40px',
        borderRadius: '6px',
      },
      '.cm-line.cm-info::before': {
        content: '""',
        position: 'absolute',
        left: '16px',
        top: '50%',
        width: '16px',
        height: '16px',
        transform: 'translateY(-50%)',
        background: INFO_ICON,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      },
      '.cm-line.cm-tally': {
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        backgroundColor: infoBackground,
        color: infoColor,
        margin: '10px 20px',
        padding: '0',
        borderRadius: '6px',
        overflow: 'hidden',
      },
      '.cm-line.cm-tally.cm-tally-selected': {
        outline: '2px solid #e05555',
        outlineOffset: '2px',
      },
      '.cm-tally-widget': {
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        flex: '1 1 auto',
        width: '100%',
        minHeight: '2.8em',
        userSelect: 'none',
        touchAction: 'manipulation',
      },
      '.cm-tally-value': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '1 1 auto',
        padding: '8px 12px',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: '600',
        color: tallyValueColor,
      },
      '.cm-tally-button': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        width: '3em',
        margin: '0',
        padding: '0',
        border: 'none',
        borderRadius: '0',
        background: tallyButtonBackground,
        color: tallyValueColor,
        fontSize: '1.1em',
        fontWeight: '600',
        lineHeight: '1',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'manipulation',
      },
      '.cm-tally-button:active': {
        background: tallyButtonActiveBackground,
        color: tallyButtonActiveColor,
      },
      '.cm-tally-delete': {
        background: 'rgba(224, 85, 85, 0.18)',
        color: '#e05555',
        fontSize: '1.3em',
      },
      '.cm-tally-delete:active': {
        background: 'rgba(224, 85, 85, 0.32)',
        color: '#ff6b6b',
      },
      '.cm-content ::selection': {
        backgroundColor: selectionBackground,
      },
      '.cm-placeholder': {
        color: placeholderColor,
      },
    },
    { dark: !isLight },
  )
}
