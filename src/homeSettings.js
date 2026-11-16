import { readJson, writeJson } from './storage.js'
import {
  DEFAULT_FLOATING_BAR_COLOR,
  createDefaultFloatingBarTools,
  normalizeFloatingBarColor,
  normalizeFloatingBarTools,
} from './floatingBarSettings.js'
import { THEME_OPTIONS, normalizeTheme } from './theme.js'

const FILENAME = 'homeSettings.json'

const QUICK_BAR_OPTIONS = ['search', 'new-note']

const SECTION_IDS = ['notebooks', 'notes']

const NOTE_CARD_DISPLAY_MODES = ['fixed', 'dynamic']

const NOTE_CARD_DISPLAY_MODE_LABELS = {
  fixed: 'Fixed height',
  dynamic: 'Dynamic',
}

const THEME_LABELS = {
  dark: 'Dark',
  light: 'Light',
  paper: 'Paper',
}

const DEFAULT_SETTINGS = {
  quickBar: 'search',
  sections: {
    notebooks: true,
    notes: true,
  },
  noteCardDisplayMode: 'fixed',
  theme: 'dark',
  floatingBarColor: DEFAULT_FLOATING_BAR_COLOR,
  floatingBarTools: createDefaultFloatingBarTools(),
}

function normalizeQuickBar(value) {
  if (QUICK_BAR_OPTIONS.includes(value)) return value
  return DEFAULT_SETTINGS.quickBar
}

function normalizeSections(sections) {
  return {
    notebooks: sections?.notebooks !== false,
    notes: sections?.notes !== false,
  }
}

function normalizeNoteCardDisplayMode(value) {
  if (NOTE_CARD_DISPLAY_MODES.includes(value)) return value
  return DEFAULT_SETTINGS.noteCardDisplayMode
}

function normalizeSettings(settings) {
  return {
    quickBar: normalizeQuickBar(settings?.quickBar),
    sections: normalizeSections(settings?.sections),
    noteCardDisplayMode: normalizeNoteCardDisplayMode(settings?.noteCardDisplayMode),
    theme: normalizeTheme(settings?.theme),
    floatingBarColor: normalizeFloatingBarColor(settings?.floatingBarColor),
    floatingBarTools: normalizeFloatingBarTools(settings?.floatingBarTools),
  }
}

export async function getHomeSettings() {
  try {
    const stored = await readJson(FILENAME, null)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(stored)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveHomeSettings(partial) {
  const current = await getHomeSettings()
  const merged = {
    ...current,
    ...partial,
    sections: partial?.sections
      ? { ...current.sections, ...partial.sections }
      : current.sections,
    floatingBarTools: partial?.floatingBarTools ?? current.floatingBarTools,
  }
  const next = normalizeSettings(merged)
  await writeJson(FILENAME, next)
  return next
}

export {
  DEFAULT_SETTINGS,
  QUICK_BAR_OPTIONS,
  SECTION_IDS,
  NOTE_CARD_DISPLAY_MODES,
  NOTE_CARD_DISPLAY_MODE_LABELS,
  THEME_OPTIONS,
  THEME_LABELS,
}
