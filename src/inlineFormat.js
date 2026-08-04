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

/**
 * Prefer a caret sitting inside empty marker pairs when display positions collapse.
 */
function findInteriorMarkerCaret(text) {
  let best = null

  for (let i = 0; i <= text.length; i += 1) {
    const stack = getOpenFormatStack(text, i)
    if (!stack.length) continue

    let pos = i
    let matches = true

    for (const format of [...stack].reverse()) {
      const close = FORMAT_MARKERS[format].close
      if (text.slice(pos, pos + close.length) !== close) {
        matches = false
        break
      }
      pos += close.length
    }

    if (matches) {
      best = i
    }
  }

  return best
}

/**
 * Map between storage text (with markers) and display text (markers stripped).
 */
export function buildFormatDisplayMap(text) {
  const displayChars = []
  const displayToStorage = []
  const storageToDisplay = Array.from({ length: text.length + 1 }, () => 0)

  let displayIndex = 0
  let i = 0

  while (i < text.length) {
    const matched = matchMarkerToken(text, i)

    if (matched) {
      for (let offset = 0; offset < matched.token.length; offset += 1) {
        storageToDisplay[i + offset] = displayIndex
      }
      i += matched.token.length
      continue
    }

    displayToStorage[displayIndex] = i
    storageToDisplay[i] = displayIndex
    displayChars.push(text[i])
    displayIndex += 1
    i += 1
  }

  storageToDisplay[text.length] = displayIndex
  const displayText = displayChars.join('')

  function toDisplay(storageIndex) {
    const clamped = Math.max(0, Math.min(storageIndex, text.length))
    return storageToDisplay[clamped]
  }

  function toStorage(displayIdx) {
    const clamped = Math.max(0, Math.min(displayIdx, displayText.length))

    if (displayText.length === 0) {
      const interior = findInteriorMarkerCaret(text)
      return interior == null ? text.length : interior
    }

    if (clamped >= displayText.length) {
      const afterLast = displayToStorage[displayText.length - 1] + 1
      const interior = findInteriorMarkerCaret(text)
      if (interior != null && interior >= afterLast) {
        return interior
      }
      return afterLast
    }

    return displayToStorage[clamped]
  }

  return {
    displayText,
    toDisplay,
    toStorage,
  }
}

export function getDisplayText(text, showFormatMarkers) {
  if (showFormatMarkers) return text
  return buildFormatDisplayMap(text).displayText
}

export function mapDisplaySelectionToStorage(text, displayStart, displayEnd) {
  const map = buildFormatDisplayMap(text)
  return {
    start: map.toStorage(displayStart),
    end: map.toStorage(displayEnd),
  }
}

export function mapStorageSelectionToDisplay(text, storageStart, storageEnd) {
  const map = buildFormatDisplayMap(text)
  return {
    start: map.toDisplay(storageStart),
    end: map.toDisplay(storageEnd),
  }
}

/**
 * Apply a textarea edit made against marker-stripped display text back onto storage.
 * preferredStorageCaret keeps inserts after hidden closing markers when display
 * positions are ambiguous (same visual index before/after markers).
 */
export function applyDisplayTextChange(
  storageText,
  oldDisplay,
  newDisplay,
  preferredStorageCaret = null,
) {
  let prefixLen = 0
  const minLen = Math.min(oldDisplay.length, newDisplay.length)

  while (
    prefixLen < minLen &&
    oldDisplay[prefixLen] === newDisplay[prefixLen]
  ) {
    prefixLen += 1
  }

  let oldSuffix = oldDisplay.length
  let newSuffix = newDisplay.length

  while (
    oldSuffix > prefixLen &&
    newSuffix > prefixLen &&
    oldDisplay[oldSuffix - 1] === newDisplay[newSuffix - 1]
  ) {
    oldSuffix -= 1
    newSuffix -= 1
  }

  const map = buildFormatDisplayMap(storageText)
  let storageStart = map.toStorage(prefixLen)
  let storageEnd =
    oldSuffix > prefixLen
      ? map.toStorage(oldSuffix - 1) + 1
      : storageStart

  // Pure insert: honor an explicit storage caret when it shares this display index
  if (
    oldSuffix === prefixLen &&
    preferredStorageCaret != null &&
    map.toDisplay(preferredStorageCaret) === prefixLen
  ) {
    storageStart = preferredStorageCaret
    storageEnd = preferredStorageCaret
  }

  const inserted = newDisplay.slice(prefixLen, newSuffix)

  return {
    text: storageText.slice(0, storageStart) + inserted + storageText.slice(storageEnd),
    selectionStart: storageStart + inserted.length,
    selectionEnd: storageStart + inserted.length,
  }
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
