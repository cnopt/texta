import { useEffect, useState } from 'react'
import { HEADING_FORMATS } from './inlineFormat.js'
import './FloatingBar.css'

const MOBILE_QUERY = '(max-width: 768px)'

const HEADING_OPTIONS = HEADING_FORMATS.map((format, index) => ({
  format,
  level: index + 1,
  label: `Heading ${index + 1}`,
}))

export default function FloatingBar({
  visible,
  activeFormats = {},
  onToggleFormat,
}) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false,
  )
  const [headingsOpen, setHeadingsOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)

    function updateMobile(event) {
      setIsMobile(event.matches)
    }

    setIsMobile(media.matches)
    media.addEventListener('change', updateMobile)

    return () => media.removeEventListener('change', updateMobile)
  }, [])

  useEffect(() => {
    if (!visible) setHeadingsOpen(false)
  }, [visible])

  function preserveEditorFocus(event) {
    event.preventDefault()
  }

  function handleHeadingSelect(format) {
    onToggleFormat?.(format)
    setHeadingsOpen(false)
  }

  if (!visible || !isMobile) return null

  const activeHeading = HEADING_FORMATS.find((format) => activeFormats[format])

  return (
    <div
      className="floating-bar"
      role="toolbar"
      aria-label="Text formatting"
      onMouseDown={preserveEditorFocus}
      onTouchStart={preserveEditorFocus}
    >
      {headingsOpen && (
        <div className="floating-bar-flyout" role="group" aria-label="Heading level">
          {HEADING_OPTIONS.map(({ format, level, label }) => (
            <button
              key={format}
              type="button"
              className={`floating-bar-button${activeFormats[format] ? ' is-active' : ''}`}
              aria-label={label}
              aria-pressed={Boolean(activeFormats[format])}
              onClick={() => handleHeadingSelect(format)}
            >
              <span className="floating-bar-icon floating-bar-icon-heading">
                H<span className="floating-bar-heading-level">{level}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`floating-bar-button${activeFormats.bold ? ' is-active' : ''}`}
        aria-label="Bold"
        aria-pressed={Boolean(activeFormats.bold)}
        onClick={() => onToggleFormat?.('bold')}
      >
        <span className="floating-bar-icon floating-bar-icon-bold">B</span>
      </button>

      <button
        type="button"
        className={`floating-bar-button${activeFormats.italic ? ' is-active' : ''}`}
        aria-label="Italic"
        aria-pressed={Boolean(activeFormats.italic)}
        onClick={() => onToggleFormat?.('italic')}
      >
        <span className="floating-bar-icon floating-bar-icon-italic">I</span>
      </button>

      <button
        type="button"
        className={`floating-bar-button${activeFormats.underline ? ' is-active' : ''}`}
        aria-label="Underline"
        aria-pressed={Boolean(activeFormats.underline)}
        onClick={() => onToggleFormat?.('underline')}
      >
        <span className="floating-bar-icon floating-bar-icon-underline">U</span>
      </button>

      <button
        type="button"
        className={`floating-bar-button${activeHeading || headingsOpen ? ' is-active' : ''}`}
        aria-label="Heading"
        aria-haspopup="true"
        aria-expanded={headingsOpen}
        onClick={() => setHeadingsOpen((open) => !open)}
      >
        <span className="floating-bar-icon floating-bar-icon-heading">H</span>
      </button>
    </div>
  )
}
