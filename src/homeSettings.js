const STORAGE_KEY = 'homeSettings'

const QUICK_BAR_OPTIONS = ['search', 'new-note']

const SECTION_IDS = ['notebooks', 'notes']

const DEFAULT_SETTINGS = {
  quickBar: 'search',
  sections: {
    notebooks: true,
    notes: true,
  },
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

function normalizeSettings(settings) {
  return {
    quickBar: normalizeQuickBar(settings?.quickBar),
    sections: normalizeSections(settings?.sections),
  }
}

export function getHomeSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveHomeSettings(partial) {
  const current = getHomeSettings()
  const merged = {
    ...current,
    ...partial,
    sections: partial?.sections
      ? { ...current.sections, ...partial.sections }
      : current.sections,
  }
  const next = normalizeSettings(merged)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export { DEFAULT_SETTINGS, QUICK_BAR_OPTIONS, SECTION_IDS }
