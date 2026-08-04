export const DEFAULT_FONT_FAMILY = 'Inter'

export const FONT_FAMILIES = [
  { id: 'Inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  {
    id: 'Bitcount Prop Single',
    label: 'Bitcount Prop Single',
    stack: "'Bitcount Prop Single', system-ui, sans-serif",
  },
  {
    id: 'Cascadia Code',
    label: 'Cascadia Code',
    stack: "'Cascadia Code', ui-monospace, monospace",
  },
  {
    id: 'DotGothic16',
    label: 'DotGothic16',
    stack: "'DotGothic16', system-ui, sans-serif",
  },
  {
    id: 'EB Garamond',
    label: 'EB Garamond',
    stack: "'EB Garamond', Georgia, serif",
  },
  {
    id: 'Noto Serif',
    label: 'Noto Serif',
    stack: "'Noto Serif', Georgia, serif",
  },
]

export function getFontFamilyStack(fontFamilyId = DEFAULT_FONT_FAMILY) {
  const match = FONT_FAMILIES.find((font) => font.id === fontFamilyId)
  return match?.stack ?? FONT_FAMILIES[0].stack
}
