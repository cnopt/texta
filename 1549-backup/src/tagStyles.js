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

export const DEFAULT_TAG_FORMAT = {
  bold: false,
  italic: false,
  underline: false,
}
