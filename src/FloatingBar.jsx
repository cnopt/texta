import { Fragment, useEffect, useLayoutEffect, useState } from 'react'
import tallyIcon from './assets/tally.svg'
import {
  createDefaultFloatingBarTools,
  DEFAULT_FLOATING_BAR_COLOR,
  getFloatingBarStyle,
  normalizeFloatingBarTools,
} from './floatingBarSettings.js'
import { HEADING_FORMATS } from './inlineFormat.js'
import './FloatingBar.css'

const MOBILE_QUERY = '(max-width: 768px)'
const EXIT_MS = 100

const HEADING_OPTIONS = HEADING_FORMATS.map((format, index) => ({
  format,
  level: index + 1,
  label: `Heading ${index + 1}`,
}))

export default function FloatingBar({
  visible,
  activeFormats = {},
  onToggleFormat,
  onIndent,
  colorId = DEFAULT_FLOATING_BAR_COLOR,
  tools = createDefaultFloatingBarTools(),
  preview = false,
}) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false,
  )
  const [headingsOpen, setHeadingsOpen] = useState(false)
  const [mounted, setMounted] = useState(visible || preview)
  const [shown, setShown] = useState(preview)

  const normalizedTools = normalizeFloatingBarTools(tools)
  const enabledTools = normalizedTools.filter((tool) => tool.enabled)
  const previewFormats = preview ? { todo: true, bold: true } : activeFormats
  const showTabTool =
    preview || (!previewFormats.callout && !previewFormats.info)

  useEffect(() => {
    if (preview) return undefined

    const media = window.matchMedia(MOBILE_QUERY)

    function updateMobile(event) {
      setIsMobile(event.matches)
    }

    setIsMobile(media.matches)
    media.addEventListener('change', updateMobile)

    return () => media.removeEventListener('change', updateMobile)
  }, [preview])

  useEffect(() => {
    if (!visible) setHeadingsOpen(false)
  }, [visible])

  useLayoutEffect(() => {
    if (preview) {
      setMounted(true)
      setShown(true)
      return undefined
    }

    if (!isMobile) {
      setMounted(false)
      setShown(false)
      return undefined
    }

    if (visible) {
      setMounted(true)
      const showFrame = requestAnimationFrame(() => {
        setShown(true)
      })
      return () => cancelAnimationFrame(showFrame)
    }

    setShown(false)
    const hideTimer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(hideTimer)
  }, [visible, isMobile, preview])

  function preserveEditorFocus(event) {
    event.preventDefault()
  }

  function handleHeadingSelect(format) {
    onToggleFormat?.(format)
    setHeadingsOpen(false)
  }

  if (!mounted || (!preview && !isMobile)) return null

  const activeHeading = HEADING_FORMATS.find((format) => previewFormats[format])

  function renderHeadingFlyout() {
    if (!headingsOpen) return null

    return (
      <div className="floating-bar-flyout" role="group" aria-label="Heading level">
        {HEADING_OPTIONS.map(({ format, level, label }) => (
          <button
            key={format}
            type="button"
            className={`floating-bar-button${previewFormats[format] ? ' is-active' : ''}`}
            aria-label={label}
            aria-pressed={Boolean(previewFormats[format])}
            onClick={() => handleHeadingSelect(format)}
          >
            <span className="floating-bar-icon floating-bar-icon-heading">
              H<span className="floating-bar-heading-level">{level}</span>
            </span>
          </button>
        ))}
      </div>
    )
  }

  function renderTool(toolId) {
    switch (toolId) {
      case 'tab':
        if (!showTabTool) return null
        return (
          <button
            key="tab"
            type="button"
            className="floating-bar-button floating-bar-tab"
            aria-label="Indent line"
            onClick={() => onIndent?.()}
          >
            <svg
              className="floating-bar-icon floating-bar-icon-tab"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 5v14" />
              <path d="M10 12h9" />
              <path d="M15 8l4 4-4 4" />
            </svg>
          </button>
        )

      case 'heading':
        return (
          <Fragment key="heading">
            {renderHeadingFlyout()}
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
          </Fragment>
        )

      case 'bold':
        return (
          <button
            key="bold"
            type="button"
            className={`floating-bar-button${previewFormats.bold ? ' is-active' : ''}`}
            aria-label="Bold"
            aria-pressed={Boolean(previewFormats.bold)}
            onClick={() => onToggleFormat?.('bold')}
          >
            <span className="floating-bar-icon floating-bar-icon-bold">B</span>
          </button>
        )

      case 'italic':
        return (
          <button
            key="italic"
            type="button"
            className={`floating-bar-button${previewFormats.italic ? ' is-active' : ''}`}
            aria-label="Italic"
            aria-pressed={Boolean(previewFormats.italic)}
            onClick={() => onToggleFormat?.('italic')}
          >
            <span className="floating-bar-icon floating-bar-icon-italic">I</span>
          </button>
        )

      case 'underline':
        return (
          <button
            key="underline"
            type="button"
            className={`floating-bar-button${previewFormats.underline ? ' is-active' : ''}`}
            aria-label="Underline"
            aria-pressed={Boolean(previewFormats.underline)}
            onClick={() => onToggleFormat?.('underline')}
          >
            <span className="floating-bar-icon floating-bar-icon-underline">U</span>
          </button>
        )

      case 'todo':
        return (
          <div key="todo" className="floating-bar-todo-group">
            <button
              type="button"
              className={`floating-bar-button${previewFormats.todo ? ' is-active' : ''}`}
              aria-label="Todo item"
              aria-pressed={Boolean(previewFormats.todo)}
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
              className={`floating-bar-button floating-bar-todo-complete${previewFormats.todo ? ' is-visible' : ''}${previewFormats.todoComplete ? ' is-active' : ''}`}
              aria-label="Complete todo"
              aria-pressed={Boolean(previewFormats.todoComplete)}
              aria-hidden={!previewFormats.todo}
              tabIndex={previewFormats.todo ? 0 : -1}
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
        )

      case 'callout':
        return (
          <button
            key="callout"
            type="button"
            className={`floating-bar-button${previewFormats.callout ? ' is-active' : ''}`}
            aria-label="Callout"
            aria-pressed={Boolean(previewFormats.callout)}
            onClick={() => onToggleFormat?.('callout')}
          >
            <svg
              className="floating-bar-icon floating-bar-icon-callout"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 5v14" />
              <path d="M11 8h7" />
              <path d="M11 12h7" />
              <path d="M11 16h5" />
            </svg>
          </button>
        )

      case 'info':
        return (
          <button
            key="info"
            type="button"
            className={`floating-bar-button${previewFormats.info ? ' is-active' : ''}`}
            aria-label="Info"
            aria-pressed={Boolean(previewFormats.info)}
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
        )

      case 'tally':
        return (
          <button
            key="tally"
            type="button"
            className={`floating-bar-button${previewFormats.tally ? ' is-active' : ''}`}
            aria-label="Tally counter"
            aria-pressed={Boolean(previewFormats.tally)}
            onClick={() => onToggleFormat?.('tally')}
          >
            <img
              className="floating-bar-icon floating-bar-icon-tally"
              src={tallyIcon}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div
      className={`floating-bar${shown ? ' is-visible' : ''}${preview ? ' floating-bar--preview' : ''}`}
      style={getFloatingBarStyle(colorId)}
      role="toolbar"
      aria-label="Text formatting"
      aria-hidden={preview ? undefined : !shown}
      inert={preview ? undefined : !shown ? true : undefined}
      onMouseDown={preview ? undefined : preserveEditorFocus}
      onTouchStart={preview ? undefined : preserveEditorFocus}
    >
      {enabledTools.map((tool) => renderTool(tool.id))}
    </div>
  )
}
