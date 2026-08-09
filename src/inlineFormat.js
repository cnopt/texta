export const FORMAT_MARKERS = {
  bold: { open: '**', close: '**' },
  italic: { open: '~~', close: '~~' },
  underline: { open: '++', close: '++' },
  h1: { open: '%1', close: '%1' },
  h2: { open: '%2', close: '%2' },
  h3: { open: '%3', close: '%3' },
}

export const FORMAT_NAMES = Object.keys(FORMAT_MARKERS)

export const HEADING_FORMATS = ['h1', 'h2', 'h3']

export const TODO_FORMAT = 'todo'
export const TODO_COMPLETE_FORMAT = 'todoComplete'
export const CALLOUT_FORMAT = 'callout'
export const INFO_FORMAT = 'info'
export const TALLY_FORMAT = 'tally'

export const TODO_PREFIX = '\u2610 '
export const TODO_COMPLETE_PREFIX = '\u2713 '
export const TODO_CANCELLED_PREFIX = '\u2715 '
export const CALLOUT_PREFIX = '|> '
export const INFO_PREFIX = 'i> '
export const TALLY_PREFIX = 't> '

const TODO_PREFIX_LENGTH = TODO_PREFIX.length
const TODO_COMPLETE_PREFIX_LENGTH = TODO_COMPLETE_PREFIX.length
const TODO_CANCELLED_PREFIX_LENGTH = TODO_CANCELLED_PREFIX.length
const CALLOUT_PREFIX_LENGTH = CALLOUT_PREFIX.length
const INFO_PREFIX_LENGTH = INFO_PREFIX.length
const TALLY_PREFIX_LENGTH = TALLY_PREFIX.length

/** Leading tab indent before a block prefix (todo / callout / info / tally). */
function getLineIndentLength(lineText) {
  let i = 0
  while (i < lineText.length && lineText[i] === '\t') i += 1
  return i
}

function lineBody(lineText) {
  return lineText.slice(getLineIndentLength(lineText))
}

function isTodoLine(lineText) {
  const body = lineBody(lineText)
  return (
    body.startsWith(TODO_PREFIX) ||
    body.startsWith(TODO_COMPLETE_PREFIX) ||
    body.startsWith(TODO_CANCELLED_PREFIX)
  )
}

function isCompleteTodoLine(lineText) {
  return lineBody(lineText).startsWith(TODO_COMPLETE_PREFIX)
}

function isCancelledTodoLine(lineText) {
  return lineBody(lineText).startsWith(TODO_CANCELLED_PREFIX)
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

export function parseTallyValue(lineText) {
  if (!isTallyLine(lineText)) return 0
  const parsed = Number.parseInt(lineBody(lineText).slice(TALLY_PREFIX_LENGTH).trim(), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function getTodoPrefix(lineText) {
  const body = lineBody(lineText)
  if (body.startsWith(TODO_COMPLETE_PREFIX)) return TODO_COMPLETE_PREFIX
  if (body.startsWith(TODO_CANCELLED_PREFIX)) return TODO_CANCELLED_PREFIX
  if (body.startsWith(TODO_PREFIX)) return TODO_PREFIX
  return null
}

function getCalloutPrefix(lineText) {
  return lineBody(lineText).startsWith(CALLOUT_PREFIX) ? CALLOUT_PREFIX : null
}

function getInfoPrefix(lineText) {
  return lineBody(lineText).startsWith(INFO_PREFIX) ? INFO_PREFIX : null
}

function getTallyPrefix(lineText) {
  return lineBody(lineText).startsWith(TALLY_PREFIX) ? TALLY_PREFIX : null
}

function stripBlockPrefixes(lineText) {
  let text = lineText

  while (
    isTodoLine(text) ||
    isCalloutLine(text) ||
    isInfoLine(text) ||
    isTallyLine(text)
  ) {
    const indent = getLineIndentLength(text)
    const body = text.slice(indent)

    if (body.startsWith(TODO_COMPLETE_PREFIX)) {
      text = text.slice(0, indent) + body.slice(TODO_COMPLETE_PREFIX_LENGTH)
    } else if (body.startsWith(TODO_CANCELLED_PREFIX)) {
      text = text.slice(0, indent) + body.slice(TODO_CANCELLED_PREFIX_LENGTH)
    } else if (body.startsWith(TODO_PREFIX)) {
      text = text.slice(0, indent) + body.slice(TODO_PREFIX_LENGTH)
    } else if (body.startsWith(CALLOUT_PREFIX)) {
      text = text.slice(0, indent) + body.slice(CALLOUT_PREFIX_LENGTH)
    } else if (body.startsWith(INFO_PREFIX)) {
      text = text.slice(0, indent) + body.slice(INFO_PREFIX_LENGTH)
    } else if (body.startsWith(TALLY_PREFIX)) {
      text = text.slice(0, indent) + body.slice(TALLY_PREFIX_LENGTH)
    } else {
      break
    }
  }

  return text.slice(getLineIndentLength(text))
}

const MARKER_TOKENS = FORMAT_NAMES.map((format) => ({
  format,
  token: FORMAT_MARKERS[format].open,
}))

function createFormatState() {
  return Object.fromEntries(FORMAT_NAMES.map((format) => [format, false]))
}

export { createFormatState }

function matchMarkerToken(text, index) {
  for (const candidate of MARKER_TOKENS) {
    if (text.startsWith(candidate.token, index)) {
      return candidate
    }
  }
  return null
}

function removeFirstCloseMarker(text, format) {
  const close = FORMAT_MARKERS[format].close
  let i = 0

  while (i < text.length) {
    const matched = matchMarkerToken(text, i)

    if (matched) {
      if (matched.format === format && matched.token === close) {
        return text.slice(0, i) + text.slice(i + matched.token.length)
      }
      i += matched.token.length
      continue
    }

    i += 1
  }

  return text
}

/**
 * Tokenize text into display segments. Markers keep their source width for caret sync.
 */
export function parseInlineFormats(text) {
  const segments = []
  const state = createFormatState()
  let buffer = ''
  let bufferStart = 0
  let i = 0

  function flush(end) {
    if (!buffer) return
    segments.push({
      type: 'text',
      text: buffer,
      start: bufferStart,
      end,
      ...state,
    })
    buffer = ''
  }

  while (i < text.length) {
    const matched = matchMarkerToken(text, i)

    if (matched) {
      flush(i)
      const token = matched.token
      segments.push({
        type: 'marker',
        text: token,
        start: i,
        end: i + token.length,
        format: matched.format,
        ...state,
      })
      state[matched.format] = !state[matched.format]
      i += token.length
      bufferStart = i
      continue
    }

    if (!buffer) bufferStart = i
    buffer += text[i]
    i += 1
  }

  flush(text.length)
  return segments
}

function stripLinePrefixForDisplay(lineText) {
  const indent = getLineIndentLength(lineText)
  const body = lineText.slice(indent)

  if (body.startsWith(CALLOUT_PREFIX)) {
    return lineText.slice(0, indent) + body.slice(CALLOUT_PREFIX_LENGTH)
  }
  if (body.startsWith(INFO_PREFIX)) {
    return lineText.slice(0, indent) + body.slice(INFO_PREFIX_LENGTH)
  }
  if (body.startsWith(TALLY_PREFIX)) {
    return lineText.slice(0, indent) + body.slice(TALLY_PREFIX_LENGTH)
  }
  return lineText
}

function stripInlineMarkers(lineText) {
  return parseInlineFormats(lineText)
    .filter((segment) => segment.type !== 'marker')
    .map((segment) => segment.text)
    .join('')
}

/** Plain text with formatting markers removed (for previews outside the editor). */
export function getDisplayText(text, showFormatMarkers = false) {
  if (showFormatMarkers) return text

  return text
    .split('\n')
    .map((line) => stripInlineMarkers(stripLinePrefixForDisplay(line)))
    .join('\n')
}

export function getFormatsAt(text, index) {
  const state = createFormatState()
  let i = 0

  while (i < text.length && i < index) {
    const matched = matchMarkerToken(text, i)

    if (matched) {
      state[matched.format] = !state[matched.format]
      i += matched.token.length
      continue
    }

    i += 1
  }

  return state
}

/**
 * Open formats at index, outermost first (toggle stack order).
 */
export function getOpenFormatStack(text, index) {
  const stack = []
  let i = 0

  while (i < text.length && i < index) {
    const matched = matchMarkerToken(text, i)

    if (matched) {
      const existing = stack.lastIndexOf(matched.format)
      if (existing === -1) {
        stack.push(matched.format)
      } else {
        stack.splice(existing, 1)
      }
      i += matched.token.length
      continue
    }

    i += 1
  }

  return stack
}

export function getFormatsForSelection(text, start, end) {
  if (start === end) {
    return getFormatsAt(text, start)
  }

  const formats = createFormatState()
  let initialized = false

  for (const segment of parseInlineFormats(text)) {
    if (segment.type !== 'text') continue

    const overlapStart = Math.max(start, segment.start)
    const overlapEnd = Math.min(end, segment.end)
    if (overlapStart >= overlapEnd) continue

    for (const format of FORMAT_NAMES) {
      formats[format] = initialized
        ? formats[format] && segment[format]
        : segment[format]
    }

    initialized = true
  }

  return initialized ? formats : createFormatState()
}

function selectionHasOutsideMarkers(text, start, end, format) {
  const { open, close } = FORMAT_MARKERS[format]
  return (
    start >= open.length &&
    end + close.length <= text.length &&
    text.slice(start - open.length, start) === open &&
    text.slice(end, end + close.length) === close
  )
}

function selectionHasInsideMarkers(text, start, end, format) {
  const { open, close } = FORMAT_MARKERS[format]
  const selected = text.slice(start, end)
  return (
    selected.length >= open.length + close.length &&
    selected.startsWith(open) &&
    selected.endsWith(close)
  )
}

/**
 * Wrap or unwrap a non-empty selection for the given format.
 */
export function toggleSelectionFormat(text, start, end, format) {
  const { open, close } = FORMAT_MARKERS[format]
  const selected = text.slice(start, end)

  if (selectionHasOutsideMarkers(text, start, end, format)) {
    const nextText =
      text.slice(0, start - open.length) + selected + text.slice(end + close.length)
    return {
      text: nextText,
      selectionStart: start - open.length,
      selectionEnd: end - open.length,
    }
  }

  if (selectionHasInsideMarkers(text, start, end, format)) {
    const inner = selected.slice(open.length, selected.length - close.length)
    const nextText = text.slice(0, start) + inner + text.slice(end)
    return {
      text: nextText,
      selectionStart: start,
      selectionEnd: start + inner.length,
    }
  }

  const nextText = text.slice(0, start) + open + selected + close + text.slice(end)
  return {
    text: nextText,
    selectionStart: start + open.length,
    selectionEnd: end + open.length,
  }
}

/**
 * Toggle format for a collapsed caret (typing mode).
 * Turns on by inserting open/close markers with the caret between them.
 * Turns off by closing the active run (or removing an empty pair).
 */
export function toggleTypingFormat(text, caret, format, currentlyActive) {
  const { open, close } = FORMAT_MARKERS[format]

  if (!currentlyActive) {
    const nextText = text.slice(0, caret) + open + close + text.slice(caret)
    return {
      text: nextText,
      selectionStart: caret + open.length,
      selectionEnd: caret + open.length,
      active: true,
    }
  }

  // Empty pair: **|**
  if (
    caret >= open.length &&
    text.slice(caret - open.length, caret) === open &&
    text.slice(caret, caret + close.length) === close
  ) {
    const nextText =
      text.slice(0, caret - open.length) + text.slice(caret + close.length)
    return {
      text: nextText,
      selectionStart: caret - open.length,
      selectionEnd: caret - open.length,
      active: false,
    }
  }

  // Caret already just before the closing marker
  if (text.slice(caret, caret + close.length) === close) {
    return {
      text,
      selectionStart: caret + close.length,
      selectionEnd: caret + close.length,
      active: false,
    }
  }

  // Close the run early at the caret and drop the leftover closer on this line
  const lineEnd = text.indexOf('\n', caret)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const restOfLine = removeFirstCloseMarker(text.slice(caret, contentEnd), format)
  const nextText =
    text.slice(0, caret) + close + restOfLine + text.slice(contentEnd)

  return {
    text: nextText,
    selectionStart: caret + close.length,
    selectionEnd: caret + close.length,
    active: false,
  }
}

/**
 * Toggle a format for either a selection or a collapsed caret.
 */
export function toggleFormat(text, start, end, format) {
  if (start !== end) {
    return toggleSelectionFormat(text, start, end, format)
  }

  const currentlyActive = getFormatsAt(text, start)[format]
  return toggleTypingFormat(text, start, format, currentlyActive)
}

/**
 * Heading levels are mutually exclusive, so any other level already covering
 * the range is removed before the requested one is applied.
 */
export function toggleHeadingFormat(text, start, end, heading) {
  const current = getFormatsForSelection(text, start, end)
  let result = { text, selectionStart: start, selectionEnd: end }

  for (const other of HEADING_FORMATS) {
    if (other === heading || !current[other]) continue

    result = toggleFormat(
      result.text,
      result.selectionStart,
      result.selectionEnd,
      other,
    )
  }

  return toggleFormat(
    result.text,
    result.selectionStart,
    result.selectionEnd,
    heading,
  )
}

function getLineStart(text, position) {
  return position > 0 ? text.lastIndexOf('\n', position - 1) + 1 : 0
}

function getSelectedLines(text, start, end) {
  const blockStart = getLineStart(text, start)
  const lineEnd = text.indexOf('\n', end)
  const blockEnd = lineEnd === -1 ? text.length : lineEnd
  const lines = []
  let from = blockStart

  for (const line of text.slice(blockStart, blockEnd).split('\n')) {
    lines.push({ text: line, from })
    from += line.length + 1
  }

  return { blockStart, blockEnd, lines }
}

export function isTodoSelection(text, start, end) {
  return getSelectedLines(text, start, end).lines.every((line) =>
    isTodoLine(line.text),
  )
}

export function isTodoCompleteSelection(text, start, end) {
  return getSelectedLines(text, start, end).lines.every((line) =>
    isCompleteTodoLine(line.text),
  )
}

export function isCalloutSelection(text, start, end) {
  return getSelectedLines(text, start, end).lines.every((line) =>
    isCalloutLine(line.text),
  )
}

export function isInfoSelection(text, start, end) {
  return getSelectedLines(text, start, end).lines.every((line) =>
    isInfoLine(line.text),
  )
}

export function isTallySelection(text, start, end) {
  return getSelectedLines(text, start, end).lines.every((line) =>
    isTallyLine(line.text),
  )
}

/**
 * Add or strip the checkbox prefix on every line the selection touches.
 * Lines only lose the prefix when all of them already have it, so a mixed
 * selection is normalised into a todo list first.
 * Completed markers are cleared together with the prefix.
 */
export function toggleTodoItem(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)
  const adding = !lines.every((line) => isTodoLine(line.text))
  let startDelta = 0
  let endDelta = 0

  const nextLines = lines.map((line) => {
    const indentLength = getLineIndentLength(line.text)
    const indent = line.text.slice(0, indentLength)

    if (adding) {
      if (isTodoLine(line.text)) return line.text

      const content = stripBlockPrefixes(line.text)
      const next = indent + TODO_PREFIX + content
      const lengthDelta = next.length - line.text.length

      if (start >= line.from) startDelta += lengthDelta
      if (end >= line.from) endDelta += lengthDelta
      return next
    }

    const prefix = getTodoPrefix(line.text)
    if (!prefix) return line.text

    const prefixLength = prefix.length
    const prefixStart = line.from + indentLength
    const prefixEnd = prefixStart + prefixLength
    // A caret sitting inside the prefix collapses to the start of the prefix.
    startDelta -=
      start >= prefixEnd
        ? prefixLength
        : start > prefixStart
          ? start - prefixStart
          : 0
    endDelta -=
      end >= prefixEnd ? prefixLength : end > prefixStart ? end - prefixStart : 0
    return indent + line.text.slice(indentLength + prefixLength)
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start + startDelta,
    selectionEnd: end + endDelta,
  }
}

/**
 * Swap the checkbox prefix between unchecked and checked on todo lines the
 * selection touches. Mixed incomplete/complete selections are normalised to
 * complete first.
 */
export function toggleTodoComplete(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)
  const completing = !lines.every((line) => isCompleteTodoLine(line.text))

  const nextLines = lines.map((line) => {
    if (!isTodoLine(line.text)) return line.text

    const indentLength = getLineIndentLength(line.text)
    const indent = line.text.slice(0, indentLength)
    const body = line.text.slice(indentLength)

    if (completing) {
      if (isCompleteTodoLine(line.text)) return line.text
      if (isCancelledTodoLine(line.text)) return line.text
      return indent + TODO_COMPLETE_PREFIX + body.slice(TODO_PREFIX_LENGTH)
    }

    if (!isCompleteTodoLine(line.text)) return line.text
    return indent + TODO_PREFIX + body.slice(TODO_COMPLETE_PREFIX_LENGTH)
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start,
    selectionEnd: end,
  }
}

/**
 * Toggle between incomplete and cancelled on todo lines the selection touches.
 * Only incomplete and cancelled lines are affected.
 */
export function toggleTodoCancelled(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)

  const nextLines = lines.map((line) => {
    const indentLength = getLineIndentLength(line.text)
    const indent = line.text.slice(0, indentLength)
    const body = line.text.slice(indentLength)

    if (body.startsWith(TODO_CANCELLED_PREFIX)) {
      return indent + TODO_PREFIX + body.slice(TODO_CANCELLED_PREFIX_LENGTH)
    }

    if (body.startsWith(TODO_PREFIX)) {
      return indent + TODO_CANCELLED_PREFIX + body.slice(TODO_PREFIX_LENGTH)
    }

    return line.text
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start,
    selectionEnd: end,
  }
}

/**
 * Add or strip the callout prefix on every line the selection touches.
 * Mixed selections are normalised into callouts first.
 */
export function toggleCallout(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)
  const adding = !lines.every((line) => isCalloutLine(line.text))
  let startDelta = 0
  let endDelta = 0

  const nextLines = lines.map((line) => {
    const indentLength = getLineIndentLength(line.text)
    const indent = line.text.slice(0, indentLength)

    if (adding) {
      if (isCalloutLine(line.text)) return line.text

      const content = stripBlockPrefixes(line.text)
      const next = indent + CALLOUT_PREFIX + content
      const lengthDelta = next.length - line.text.length

      if (start >= line.from) startDelta += lengthDelta
      if (end >= line.from) endDelta += lengthDelta
      return next
    }

    const prefix = getCalloutPrefix(line.text)
    if (!prefix) return line.text

    const prefixStart = line.from + indentLength
    const prefixEnd = prefixStart + CALLOUT_PREFIX_LENGTH
    startDelta -=
      start >= prefixEnd
        ? CALLOUT_PREFIX_LENGTH
        : start > prefixStart
          ? start - prefixStart
          : 0
    endDelta -=
      end >= prefixEnd
        ? CALLOUT_PREFIX_LENGTH
        : end > prefixStart
          ? end - prefixStart
          : 0
    return indent + line.text.slice(indentLength + CALLOUT_PREFIX_LENGTH)
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start + startDelta,
    selectionEnd: end + endDelta,
  }
}

/**
 * Add or strip the info prefix on every line the selection touches.
 * Mixed selections are normalised into info lines first.
 */
export function toggleInfo(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)
  const adding = !lines.every((line) => isInfoLine(line.text))
  let startDelta = 0
  let endDelta = 0

  const nextLines = lines.map((line) => {
    const indentLength = getLineIndentLength(line.text)
    const indent = line.text.slice(0, indentLength)

    if (adding) {
      if (isInfoLine(line.text)) return line.text

      const content = stripBlockPrefixes(line.text)
      const next = indent + INFO_PREFIX + content
      const lengthDelta = next.length - line.text.length

      if (start >= line.from) startDelta += lengthDelta
      if (end >= line.from) endDelta += lengthDelta
      return next
    }

    const prefix = getInfoPrefix(line.text)
    if (!prefix) return line.text

    const prefixStart = line.from + indentLength
    const prefixEnd = prefixStart + INFO_PREFIX_LENGTH
    startDelta -=
      start >= prefixEnd
        ? INFO_PREFIX_LENGTH
        : start > prefixStart
          ? start - prefixStart
          : 0
    endDelta -=
      end >= prefixEnd
        ? INFO_PREFIX_LENGTH
        : end > prefixStart
          ? end - prefixStart
          : 0
    return indent + line.text.slice(indentLength + INFO_PREFIX_LENGTH)
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start + startDelta,
    selectionEnd: end + endDelta,
  }
}

/**
 * Insert a tally counter on the line after the caret's line, then an empty
 * line with the caret on it so the user can keep typing after the block.
 */
export function insertTally(text, _start, end) {
  const lineEnd = text.indexOf('\n', end)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const insert = `\n${TALLY_PREFIX}0\n`
  const selection = contentEnd + insert.length

  return {
    text: text.slice(0, contentEnd) + insert + text.slice(contentEnd),
    selectionStart: selection,
    selectionEnd: selection,
  }
}

/** Rewrite a tally line's numeric value. Returns null when the line is not a tally. */
export function setTallyValue(text, lineFrom, value) {
  const lineStart = getLineStart(text, lineFrom)
  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const lineText = text.slice(lineStart, contentEnd)

  if (!isTallyLine(lineText)) return null

  const indent = lineText.slice(0, getLineIndentLength(lineText))
  const nextLine = `${indent}${TALLY_PREFIX}${value}`
  return {
    text: text.slice(0, lineStart) + nextLine + text.slice(contentEnd),
    selectionStart: lineStart + nextLine.length,
    selectionEnd: lineStart + nextLine.length,
  }
}

/**
 * Backspacing from the start of a todo item's text drops the whole prefix in
 * one press. Deleting only the space would leave a checkbox glued to the text,
 * which no longer reads as a todo item anyway.
 *
 * Returns null when the caret is not in that position, leaving the default
 * backspace behaviour in place.
 */
export function deleteTodoPrefix(text, caret) {
  const lineStart = getLineStart(text, caret)
  const lineText = text.slice(lineStart)
  const indentLength = getLineIndentLength(lineText)
  const prefix = getTodoPrefix(lineText)

  if (!prefix) return null
  if (caret !== lineStart + indentLength + prefix.length) return null

  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const prefixStart = lineStart + indentLength

  return {
    text:
      text.slice(0, prefixStart) +
      text.slice(prefixStart + prefix.length, contentEnd) +
      text.slice(contentEnd),
    selectionStart: prefixStart,
    selectionEnd: prefixStart,
  }
}

/**
 * Backspacing from the start of callout text removes the whole prefix in one
 * press, matching todo-prefix behaviour.
 */
export function deleteCalloutPrefix(text, caret) {
  const lineStart = getLineStart(text, caret)
  const lineText = text.slice(lineStart)
  const indentLength = getLineIndentLength(lineText)
  const prefix = getCalloutPrefix(lineText)

  if (!prefix) return null
  if (caret !== lineStart + indentLength + CALLOUT_PREFIX_LENGTH) return null

  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const prefixStart = lineStart + indentLength

  return {
    text:
      text.slice(0, prefixStart) +
      text.slice(prefixStart + CALLOUT_PREFIX_LENGTH, contentEnd) +
      text.slice(contentEnd),
    selectionStart: prefixStart,
    selectionEnd: prefixStart,
  }
}

/**
 * Backspacing from the start of info text removes the whole prefix in one press.
 */
export function deleteInfoPrefix(text, caret) {
  const lineStart = getLineStart(text, caret)
  const lineText = text.slice(lineStart)
  const indentLength = getLineIndentLength(lineText)
  const prefix = getInfoPrefix(lineText)

  if (!prefix) return null
  if (caret !== lineStart + indentLength + INFO_PREFIX_LENGTH) return null

  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const prefixStart = lineStart + indentLength

  return {
    text:
      text.slice(0, prefixStart) +
      text.slice(prefixStart + INFO_PREFIX_LENGTH, contentEnd) +
      text.slice(contentEnd),
    selectionStart: prefixStart,
    selectionEnd: prefixStart,
  }
}

/**
 * Backspacing from the start of tally text removes the whole prefix in one press.
 */
export function deleteTallyPrefix(text, caret) {
  const lineStart = getLineStart(text, caret)
  const lineText = text.slice(lineStart)
  const indentLength = getLineIndentLength(lineText)
  const prefix = getTallyPrefix(lineText)

  if (!prefix) return null
  if (caret !== lineStart + indentLength + TALLY_PREFIX_LENGTH) return null

  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const prefixStart = lineStart + indentLength

  return {
    text:
      text.slice(0, prefixStart) +
      text.slice(prefixStart + TALLY_PREFIX_LENGTH, contentEnd) +
      text.slice(contentEnd),
    selectionStart: prefixStart,
    selectionEnd: prefixStart,
  }
}

/**
 * On a todo line, insert a newline and start the next line as an unchecked todo
 * item. Returns null when the caret is not on todo item text.
 */
export function insertTodoNewline(text, caret) {
  const lineStart = getLineStart(text, caret)
  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  const lineText = text.slice(lineStart, contentEnd)
  const indentLength = getLineIndentLength(lineText)
  const indent = lineText.slice(0, indentLength)
  const prefix = getTodoPrefix(lineText)

  if (!prefix) return null
  if (caret < lineStart + indentLength + prefix.length) return null

  const result = closeFormatsAndInsertNewline(text, caret)
  const newLineStart = result.selectionStart
  const inserted = indent + TODO_PREFIX

  return {
    text:
      result.text.slice(0, newLineStart) +
      inserted +
      result.text.slice(newLineStart),
    selectionStart: newLineStart + inserted.length,
    selectionEnd: newLineStart + inserted.length,
  }
}

/**
 * Close any open inline formats at the caret, then insert a newline.
 * Leftover closing markers on the same line are stripped so styles end at the break.
 */
export function closeFormatsAndInsertNewline(text, caret) {
  const openStack = getOpenFormatStack(text, caret)
  if (!openStack.length) {
    return {
      text: `${text.slice(0, caret)}\n${text.slice(caret)}`,
      selectionStart: caret + 1,
      selectionEnd: caret + 1,
    }
  }

  const lineEnd = text.indexOf('\n', caret)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd
  let closedPrefix = text.slice(0, caret)
  let restOfLine = text.slice(caret, contentEnd)
  const afterLine = text.slice(contentEnd)
  const closeOrder = [...openStack].reverse()

  closeOrder.forEach((format) => {
    closedPrefix += FORMAT_MARKERS[format].close
  })

  closeOrder.forEach((format) => {
    restOfLine = removeFirstCloseMarker(restOfLine, format)
  })

  const nextText = `${closedPrefix}\n${restOfLine}${afterLine}`
  const nextCaret = closedPrefix.length + 1

  return {
    text: nextText,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  }
}

/**
 * Insert a tab at the start of every line the selection touches.
 */
export function indentSelectedLines(text, start, end) {
  const { blockStart, blockEnd, lines } = getSelectedLines(text, start, end)
  let startDelta = 0
  let endDelta = 0

  const nextLines = lines.map((line) => {
    if (start >= line.from) startDelta += 1
    if (end >= line.from) endDelta += 1
    return `\t${line.text}`
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start + startDelta,
    selectionEnd: end + endDelta,
  }
}

/**
 * True when the text on the caret's line, up to the caret, ends with ':'.
 */
export function lineEndsWithColon(text, caret) {
  const lineStart = getLineStart(text, caret)
  const beforeCaret = text.slice(lineStart, caret).replace(/[ \t]+$/, '')
  return beforeCaret.endsWith(':')
}

/**
 * Insert a tab at `position` and shift the selection if it sits at or after that point.
 */
export function insertTabAt(text, position, selectionStart, selectionEnd) {
  return {
    text: `${text.slice(0, position)}\t${text.slice(position)}`,
    selectionStart: selectionStart >= position ? selectionStart + 1 : selectionStart,
    selectionEnd: selectionEnd >= position ? selectionEnd + 1 : selectionEnd,
  }
}
