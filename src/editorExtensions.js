import { Capacitor } from '@capacitor/core'
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import {
  HEADING_FORMATS,
  TODO_COMPLETE_PREFIX,
  parseInlineFormats,
} from './inlineFormat.js'
import { getTagStyleString } from './tagStyles.js'

const isAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

let pendingAndroidScrollFrame = 0

function isCursorVisible(view, head) {
  const coords = view.coordsAtPos(head)
  if (!coords) return true

  const bounds = view.scrollDOM.getBoundingClientRect()
  return coords.top >= bounds.top - 4 && coords.bottom <= bounds.bottom + 4
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
      if (!update.selectionSet && !(update.focusChanged && update.view.hasFocus)) {
        return
      }

      scheduleAndroidCursorScroll(update.view)
    }),
  ]
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
const TODO_COMPLETE_DECORATION = Decoration.mark({ class: 'cm-todo-complete' })

function isCompleteTodoLine(lineText) {
  return lineText.startsWith(TODO_COMPLETE_PREFIX)
}

function findLineTagMatch(line, tags) {
  const sortedTags = [...tags].sort((a, b) => b.trigger.length - a.trigger.length)
  let earliest = null

  for (const tag of sortedTags) {
    const index = line.indexOf(`${tag.trigger} `)
    if (index === -1) continue

    if (!earliest || index < earliest.index) {
      earliest = { tag, index }
    }
  }

  return earliest
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
function collectLineDecorations(line, customTags, showMarkers, decorations, hidden) {
  if (!line.length) return

  if (isCompleteTodoLine(line.text)) {
    decorations.push(TODO_COMPLETE_DECORATION.range(line.from, line.to))
  }

  const tagMatch = findLineTagMatch(line.text, customTags)
  if (tagMatch) {
    const style = getTagStyleString(tagMatch.tag)
    if (style) {
      decorations.push(
        Decoration.mark({ attributes: { style } }).range(
          line.from + tagMatch.index,
          line.to,
        ),
      )
    }
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

  for (const { from, to } of view.visibleRanges) {
    let pos = from

    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      collectLineDecorations(line, customTags, showMarkers, decorations, hidden)
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
        if (update.docChanged || update.viewportChanged) {
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
}) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'transparent',
        color: '#ebebeb',
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
        caretColor: '#ebebeb',
      },
      '.cm-line': {
        padding: '0',
      },
      '.cm-content ::selection': {
        backgroundColor: 'rgba(55, 122, 255, 0.35)',
      },
      '.cm-placeholder': {
        color: '#9a9a9a',
      },
    },
    { dark: true },
  )
}
