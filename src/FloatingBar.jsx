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
        className={`floating-bar-button${activeHeading || headingsOpen ? ' is-active' : ''}`}
        aria-label="Heading"
        aria-haspopup="true"
        aria-expanded={headingsOpen}
        onClick={() => setHeadingsOpen((open) => !open)}
      >
        <span className="floating-bar-icon floating-bar-icon-heading">H</span>
      </button>

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

      <div className="floating-bar-todo-group">
        <button
          type="button"
          className={`floating-bar-button${activeFormats.todo ? ' is-active' : ''}`}
          aria-label="Todo item"
          aria-pressed={Boolean(activeFormats.todo)}
          onClick={() => onToggleFormat?.('todo')}
        >
          <svg
            className="floating-bar-icon floating-bar-icon-todo"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="5" />
          </svg>
        </button>

        <button
          type="button"
          className={`floating-bar-button floating-bar-todo-complete${activeFormats.todo ? ' is-visible' : ''}${activeFormats.todoComplete ? ' is-active' : ''}`}
          aria-label="Complete todo"
          aria-pressed={Boolean(activeFormats.todoComplete)}
          aria-hidden={!activeFormats.todo}
          tabIndex={activeFormats.todo ? 0 : -1}
          onClick={() => onToggleFormat?.('todoComplete')}
        >
          <svg
            className="floating-bar-icon floating-bar-icon-todo-complete"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="5" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className={`floating-bar-button${activeFormats.callout ? ' is-active' : ''}`}
        aria-label="Callout"
        aria-pressed={Boolean(activeFormats.callout)}
        onClick={() => onToggleFormat?.('callout')}
      >
        <svg
          className="floating-bar-icon floating-bar-icon-callout"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="5" y="5" width="14" height="14" rx="2.5" />
        </svg>
      </button>

      <button
        type="button"
        className={`floating-bar-button${activeFormats.info ? ' is-active' : ''}`}
        aria-label="Info"
        aria-pressed={Boolean(activeFormats.info)}
        onClick={() => onToggleFormat?.('info')}
      >
        <svg
          className="floating-bar-icon floating-bar-icon-info"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <circle className="floating-bar-icon-info-dot" cx="12" cy="8" r="1" />
        </svg>
      </button>
    </div>
  )
}
