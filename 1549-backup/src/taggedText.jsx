import { getTagStyle } from './tagStyles.js'
import { HEADING_FORMATS, parseInlineFormats } from './inlineFormat.js'

// Kept close to 1x on purpose: the highlight overlay has to stay aligned with
// the plain textarea underneath it, and larger glyphs drift the caret away.
const HEADING_STYLES = {
  h1: { fontSize: '1.3em', fontWeight: 700 },
  h2: { fontSize: '1.15em', fontWeight: 700 },
  h3: { fontSize: '1.05em', fontWeight: 600 },
}

function findLineTagMatch(line, tags) {
  const sortedTags = [...tags].sort((a, b) => b.trigger.length - a.trigger.length)
  let earliest = null

  for (const tag of sortedTags) {
    const pattern = `${tag.trigger} `
    const index = line.indexOf(pattern)
    if (index === -1) continue

    if (!earliest || index < earliest.index) {
      earliest = {
        tag,
        index,
        triggerEnd: index + tag.trigger.length,
        styledStart: index + pattern.length,
      }
    }
  }

  return earliest
}

function getInlineStyle(segment) {
  const style = {}
  const heading = HEADING_FORMATS.find((format) => segment[format])

  if (heading) Object.assign(style, HEADING_STYLES[heading])
  if (segment.bold) style.fontWeight = 700
  if (segment.italic) style.fontStyle = 'italic'
  if (segment.underline) style.textDecoration = 'underline'

  return style
}

function renderInlineFormatted(text, keyPrefix, showFormatMarkers) {
  if (!text) return text

  const segments = parseInlineFormats(text)

  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`

    if (segment.type === 'marker') {
      if (!showFormatMarkers) return null

      return (
        <span key={key} className="editor-format-marker">
          {segment.text}
        </span>
      )
    }

    const style = getInlineStyle(segment)
    if (Object.keys(style).length === 0) {
      return <span key={key}>{segment.text}</span>
    }

    return (
      <span key={key} className="editor-inline-format" style={style}>
        {segment.text}
      </span>
    )
  })
}

function renderTaggedLine(line, tags, lineKey, showFormatMarkers) {
  if (!line) {
    return line
  }

  if (!tags.length) {
    return renderInlineFormatted(line, lineKey, showFormatMarkers)
  }

  const match = findLineTagMatch(line, tags)
  if (!match) {
    return renderInlineFormatted(line, lineKey, showFormatMarkers)
  }

  const { tag, index, triggerEnd, styledStart } = match
  const before = line.slice(0, index)
  const trigger = line.slice(index, triggerEnd)
  const styled = line.slice(styledStart)

  return (
    <>
      {renderInlineFormatted(before, `${lineKey}-before`, showFormatMarkers)}
      <span className="editor-tag" style={getTagStyle(tag)}>
        {trigger}{' '}
        {renderInlineFormatted(styled, `${lineKey}-styled`, showFormatMarkers)}
      </span>
    </>
  )
}

export function renderTaggedContent(text, tags, showFormatMarkers = false) {
  const lines = text.split('\n')
  const lastIndex = lines.length - 1

  return lines.map((line, index) => (
    <span key={index}>
      {renderTaggedLine(line, tags, `line-${index}`, showFormatMarkers)}
      {index < lastIndex ? '\n' : null}
      {/* A textarea keeps a line box for the empty line after a trailing
          newline; pre-wrap drops it, which would desync overlay scrolling. */}
      {index === lastIndex && line === '' ? '\u200b' : null}
    </span>
  ))
}
