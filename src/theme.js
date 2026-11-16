const THEME_OPTIONS = ['dark', 'light', 'paper']

function normalizeTheme(value) {
  if (THEME_OPTIONS.includes(value)) return value
  return 'dark'
}

function applyTheme(theme) {
  const next = normalizeTheme(theme)

  if (next === 'dark') {
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = 'dark'
    return
  }

  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = 'light'
}

export { THEME_OPTIONS, applyTheme, normalizeTheme }
