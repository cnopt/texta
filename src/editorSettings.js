import { DEFAULT_FONT_FAMILY, FONT_FAMILIES } from './fontFamilies.js'
import { readJson, writeJson } from './storage.js'

const FILENAME = 'editorSettings.json'
const DEFAULT_FONT_SIZE = 16
const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 28
const DEFAULT_LINE_HEIGHT = 23
const MIN_LINE_HEIGHT = 16
const MAX_LINE_HEIGHT = 48

const TEXT_ALIGNMENTS = ['left', 'right', 'justify']
const DEFAULT_TEXT_ALIGNMENT = 'left'

const TEXT_ALIGNMENT_LABELS = {
  left: 'Left',
  right: 'Right',
  justify: 'Justify',
}

const DEFAULT_SETTINGS = {
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  fontFamily: DEFAULT_FONT_FAMILY,
  textAlignment: DEFAULT_TEXT_ALIGNMENT,
  displayFormattingMarkers: false,
  todoSpacing: false,
  stayInTodo: false,
}

function defaultLineHeightForFontSize(fontSize) {
  return Math.round((fontSize * (DEFAULT_LINE_HEIGHT / DEFAULT_FONT_SIZE)) * 10) / 10
}

function clampFontSize(value) {
  const size = Number(value)
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

function clampLineHeight(value, fontSize = DEFAULT_FONT_SIZE) {
  const height = Number(value)
  if (!Number.isFinite(height)) return defaultLineHeightForFontSize(fontSize)
  return Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, Math.round(height)))
}

function normalizeFontFamily(value) {
  if (FONT_FAMILIES.some((font) => font.id === value)) return value
  return DEFAULT_FONT_FAMILY
}

function normalizeTextAlignment(value) {
  if (TEXT_ALIGNMENTS.includes(value)) return value
  return DEFAULT_TEXT_ALIGNMENT
}

function normalizeSettings(settings) {
  const fontSize = clampFontSize(settings?.fontSize)
  const lineHeight =
    settings?.lineHeight == null
      ? defaultLineHeightForFontSize(fontSize)
      : clampLineHeight(settings.lineHeight, fontSize)

  return {
    fontSize,
    lineHeight,
    fontFamily: normalizeFontFamily(settings?.fontFamily),
    textAlignment: normalizeTextAlignment(settings?.textAlignment),
    displayFormattingMarkers: Boolean(settings?.displayFormattingMarkers),
    todoSpacing: Boolean(settings?.todoSpacing),
    stayInTodo: Boolean(settings?.stayInTodo),
  }
}

export async function getEditorSettings() {
  try {
    const stored = await readJson(FILENAME, null)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(stored)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveEditorSettings(settings) {
  const next = normalizeSettings(settings)
  await writeJson(FILENAME, next)
  return next
}

export {
  DEFAULT_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  MIN_LINE_HEIGHT,
  MAX_LINE_HEIGHT,
  TEXT_ALIGNMENTS,
  TEXT_ALIGNMENT_LABELS,
  DEFAULT_TEXT_ALIGNMENT,
  DEFAULT_SETTINGS,
}
