import { DEFAULT_FONT_FAMILY, FONT_FAMILIES } from './fontFamilies.js'

const STORAGE_KEY = 'editorSettings'
const DEFAULT_FONT_SIZE = 18
const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 28

const DEFAULT_SETTINGS = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  displayFormattingMarkers: false,
}

function clampFontSize(value) {
  const size = Number(value)
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

function normalizeFontFamily(value) {
  if (FONT_FAMILIES.some((font) => font.id === value)) return value
  return DEFAULT_FONT_FAMILY
}

function normalizeSettings(settings) {
  return {
    fontSize: clampFontSize(settings?.fontSize),
    fontFamily: normalizeFontFamily(settings?.fontFamily),
    displayFormattingMarkers: Boolean(settings?.displayFormattingMarkers),
  }
}

export function getEditorSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveEditorSettings(settings) {
  const next = normalizeSettings(settings)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export { DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_SETTINGS }
