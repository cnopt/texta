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

export const TODO_PREFIX = '\u2610 '
export const TODO_COMPLETE_PREFIX = '\u2611 '

const TODO_PREFIX_LENGTH = TODO_PREFIX.length

function isTodoLine(lineText) {
  return (
    lineText.startsWith(TODO_PREFIX) || lineText.startsWith(TODO_COMPLETE_PREFIX)
  )
}

function isCompleteTodoLine(lineText) {
  return lineText.startsWith(TODO_COMPLETE_PREFIX)
}

function getTodoPrefix(lineText) {
  if (lineText.startsWith(TODO_COMPLETE_PREFIX)) return TODO_COMPLETE_PREFIX
  if (lineText.startsWith(TODO_PREFIX)) return TODO_PREFIX
  return null
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
    if (adding) {
      if (isTodoLine(line.text)) return line.text

      if (start >= line.from) startDelta += TODO_PREFIX_LENGTH
      if (end >= line.from) endDelta += TODO_PREFIX_LENGTH
      return TODO_PREFIX + line.text
    }

    const prefix = getTodoPrefix(line.text)
    if (!prefix) return line.text

    const prefixEnd = line.from + TODO_PREFIX_LENGTH
    // A caret sitting inside the prefix collapses to the start of the line.
    startDelta -= start >= prefixEnd ? TODO_PREFIX_LENGTH : Math.max(0, start - line.from)
    endDelta -= end >= prefixEnd ? TODO_PREFIX_LENGTH : Math.max(0, end - line.from)
    return line.text.slice(TODO_PREFIX_LENGTH)
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

    if (completing) {
      if (isCompleteTodoLine(line.text)) return line.text
      return TODO_COMPLETE_PREFIX + line.text.slice(TODO_PREFIX_LENGTH)
    }

    if (!isCompleteTodoLine(line.text)) return line.text
    return TODO_PREFIX + line.text.slice(TODO_PREFIX_LENGTH)
  })

  return {
    text: text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd),
    selectionStart: start,
    selectionEnd: end,
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
  const prefix = getTodoPrefix(text.slice(lineStart))

  if (!prefix) return null
  if (caret !== lineStart + TODO_PREFIX_LENGTH) return null

  const lineEnd = text.indexOf('\n', lineStart)
  const contentEnd = lineEnd === -1 ? text.length : lineEnd

  return {
    text:
      text.slice(0, lineStart) +
      text.slice(lineStart + TODO_PREFIX_LENGTH, contentEnd) +
      text.slice(contentEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart,
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
