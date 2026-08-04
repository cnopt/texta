export function getTagStyle(tag) {
  const style = {}

  if (tag.textColor) {
    style.color = tag.textColor
  }

  if (tag.bold) {
    style.fontWeight = 700
  }

  if (tag.italic) {
    style.fontStyle = 'italic'
  }

  if (tag.underline) {
    style.textDecoration = 'underline'
  }

  return style
}

const CSS_PROPERTY_NAMES = {
  color: 'color',
  fontWeight: 'font-weight',
  fontStyle: 'font-style',
  textDecoration: 'text-decoration',
}

/**
 * CodeMirror decorations take a style attribute string rather than a React
 * style object, so this derives one from the same rules.
 */
export function getTagStyleString(tag) {
  return Object.entries(getTagStyle(tag))
    .map(([property, value]) => `${CSS_PROPERTY_NAMES[property]}:${value}`)
    .join(';')
}

export const DEFAULT_TAG_FORMAT = {
  bold: false,
  italic: false,
  underline: false,
}
