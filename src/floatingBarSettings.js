export const FLOATING_BAR_TOOL_IDS = [
  'tab',
  'heading',
  'bold',
  'italic',
  'underline',
  'todo',
  'callout',
  'info',
  'tally',
]

export const FLOATING_BAR_TOOL_LABELS = {
  tab: 'Indent',
  heading: 'Heading',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  todo: 'Todo',
  callout: 'Callout',
  info: 'Info',
  tally: 'Tally',
}

export const FLOATING_BAR_COLOR_OPTIONS = [
  {
    id: 'blue',
    label: 'Blue',
    background: '#1a2744',
    foreground: '#c5d4f0',
    foregroundActive: '#eef3ff',
    border: 'rgba(160, 190, 240, 0.12)',
    flyoutBackground: '#223256',
    flyoutBorder: 'rgba(160, 190, 240, 0.16)',
    activeBackground: 'rgba(197, 212, 240, 0.14)',
    tallyFilter:
      'brightness(0) invert(88%) sepia(12%) saturate(507%) hue-rotate(185deg) brightness(97%) contrast(92%)',
    tallyFilterActive:
      'brightness(0) invert(96%) sepia(8%) saturate(302%) hue-rotate(185deg) brightness(103%) contrast(104%)',
  },
  {
    id: 'slate',
    label: 'Slate',
    background: '#2a2a2e',
    foreground: '#d4d4d8',
    foregroundActive: '#f4f4f5',
    border: 'rgba(212, 212, 216, 0.12)',
    flyoutBackground: '#35353a',
    flyoutBorder: 'rgba(212, 212, 216, 0.16)',
    activeBackground: 'rgba(212, 212, 216, 0.14)',
    tallyFilter:
      'brightness(0) invert(90%) sepia(4%) saturate(200%) hue-rotate(202deg) brightness(95%) contrast(90%)',
    tallyFilterActive:
      'brightness(0) invert(98%) sepia(2%) saturate(100%) hue-rotate(202deg) brightness(103%) contrast(100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    background: '#1a2e24',
    foreground: '#c5e8d4',
    foregroundActive: '#e8f8ee',
    border: 'rgba(197, 232, 212, 0.12)',
    flyoutBackground: '#22382c',
    flyoutBorder: 'rgba(197, 232, 212, 0.16)',
    activeBackground: 'rgba(197, 232, 212, 0.14)',
    tallyFilter:
      'brightness(0) invert(88%) sepia(14%) saturate(420%) hue-rotate(98deg) brightness(97%) contrast(92%)',
    tallyFilterActive:
      'brightness(0) invert(96%) sepia(10%) saturate(280%) hue-rotate(98deg) brightness(103%) contrast(104%)',
  },
  {
    id: 'plum',
    label: 'Plum',
    background: '#2a1a2e',
    foreground: '#e8c5f0',
    foregroundActive: '#f8e8fc',
    border: 'rgba(232, 197, 240, 0.12)',
    flyoutBackground: '#35223a',
    flyoutBorder: 'rgba(232, 197, 240, 0.16)',
    activeBackground: 'rgba(232, 197, 240, 0.14)',
    tallyFilter:
      'brightness(0) invert(88%) sepia(18%) saturate(520%) hue-rotate(248deg) brightness(97%) contrast(92%)',
    tallyFilterActive:
      'brightness(0) invert(96%) sepia(12%) saturate(320%) hue-rotate(248deg) brightness(103%) contrast(104%)',
  },
  {
    id: 'amber',
    label: 'Amber',
    background: '#2e241a',
    foreground: '#f0dcc5',
    foregroundActive: '#fff4e8',
    border: 'rgba(240, 220, 197, 0.12)',
    flyoutBackground: '#3a3022',
    flyoutBorder: 'rgba(240, 220, 197, 0.16)',
    activeBackground: 'rgba(240, 220, 197, 0.14)',
    tallyFilter:
      'brightness(0) invert(88%) sepia(16%) saturate(480%) hue-rotate(358deg) brightness(97%) contrast(92%)',
    tallyFilterActive:
      'brightness(0) invert(96%) sepia(10%) saturate(300%) hue-rotate(358deg) brightness(103%) contrast(104%)',
  },
]

export const DEFAULT_FLOATING_BAR_COLOR = 'blue'

export function createDefaultFloatingBarTools() {
  return FLOATING_BAR_TOOL_IDS.map((id) => ({ id, enabled: true }))
}

export function normalizeFloatingBarColor(value) {
  if (FLOATING_BAR_COLOR_OPTIONS.some((option) => option.id === value)) return value
  return DEFAULT_FLOATING_BAR_COLOR
}

export function normalizeFloatingBarTools(tools) {
  if (!Array.isArray(tools)) return createDefaultFloatingBarTools()

  const ordered = []
  const seen = new Set()

  for (const tool of tools) {
    if (!tool?.id || !FLOATING_BAR_TOOL_IDS.includes(tool.id) || seen.has(tool.id)) continue
    seen.add(tool.id)
    ordered.push({ id: tool.id, enabled: tool.enabled !== false })
  }

  for (const id of FLOATING_BAR_TOOL_IDS) {
    if (!seen.has(id)) ordered.push({ id, enabled: true })
  }

  return ordered
}

export function getFloatingBarColorScheme(colorId) {
  return (
    FLOATING_BAR_COLOR_OPTIONS.find((option) => option.id === colorId) ??
    FLOATING_BAR_COLOR_OPTIONS[0]
  )
}

export function getFloatingBarColorLabel(colorId) {
  return getFloatingBarColorScheme(colorId).label
}

export function reorderFloatingBarTools(tools, fromIndex, toIndex) {
  const normalized = normalizeFloatingBarTools(tools)
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= normalized.length ||
    toIndex >= normalized.length
  ) {
    return normalized
  }

  const next = [...normalized]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function setFloatingBarToolEnabled(tools, toolId, enabled) {
  return normalizeFloatingBarTools(tools).map((tool) =>
    tool.id === toolId ? { ...tool, enabled } : tool,
  )
}

export function getFloatingBarStyle(colorId) {
  const scheme = getFloatingBarColorScheme(colorId)

  return {
    '--floating-bar-bg': scheme.background,
    '--floating-bar-fg': scheme.foreground,
    '--floating-bar-fg-active': scheme.foregroundActive,
    '--floating-bar-border': scheme.border,
    '--floating-bar-flyout-bg': scheme.flyoutBackground,
    '--floating-bar-flyout-border': scheme.flyoutBorder,
    '--floating-bar-active-bg': scheme.activeBackground,
    '--floating-bar-tally-filter': scheme.tallyFilter,
    '--floating-bar-tally-filter-active': scheme.tallyFilterActive,
  }
}
