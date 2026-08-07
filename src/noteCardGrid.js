export const NOTE_CARD_LINE_HEIGHT = 16
export const NOTE_CARD_MAX_LINES = 6
export const NOTE_CARD_PADDING_ROWS = 2
export const NOTE_CARD_CHARS_PER_LINE = 26

export function countPreviewLines(text) {
  const trimmed = text.trim()
  if (!trimmed) return 1

  return text.split('\n').reduce((total, line) => {
    if (line.length === 0) return total + 1
    return total + Math.max(1, Math.ceil(line.length / NOTE_CARD_CHARS_PER_LINE))
  }, 0)
}

export function getNoteCardMetrics(previewText) {
  const actualLines = countPreviewLines(previewText)
  const displayLines = Math.min(NOTE_CARD_MAX_LINES, Math.max(1, actualLines))
  const isClamped = actualLines > NOTE_CARD_MAX_LINES

  return {
    actualLines,
    displayLines,
    isClamped,
    rowSpan: NOTE_CARD_PADDING_ROWS + displayLines,
  }
}
