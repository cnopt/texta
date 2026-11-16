import { useEffect, useRef } from 'react'
import './PageTab.css'

const LONG_PRESS_MS = 500
const MOVE_THRESHOLD_PX = 10

function PageIcon() {
  return (
    <svg
      className="page-tab-icon"
      viewBox="0 0 16 20"
      width="16"
      height="20"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M3 2.5h7.2L13.5 5.8V17.5H3V2.5z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 2.5v3.3h3.3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 8.5h5.6M5.2 11h5.6M5.2 13.5h4.2"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

export default function PageTab({
  title,
  variant = 'page',
  className = '',
  style,
  onClick,
  onLongPress,
}) {
  const isCreate = variant === 'create'
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const onLongPressRef = useRef(onLongPress)
  const trackingRef = useRef(null)

  onLongPressRef.current = onLongPress

  if (trackingRef.current === null) {
    const stopTracking = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      window.removeEventListener('pointermove', tracking.onMove)
      window.removeEventListener('pointerup', tracking.onUp)
      window.removeEventListener('pointercancel', tracking.onUp)
    }

    const tracking = {
      stop: stopTracking,
      onMove(event) {
        if (!longPressTimerRef.current) return

        const dx = event.clientX - startPosRef.current.x
        const dy = event.clientY - startPosRef.current.y
        if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
          stopTracking()
        }
      },
      onUp() {
        stopTracking()
      },
    }

    trackingRef.current = tracking
  }

  useEffect(() => () => trackingRef.current?.stop(), [])

  function handlePointerDown(event) {
    if (!onLongPress || isCreate) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const tracking = trackingRef.current
    longPressTriggeredRef.current = false
    startPosRef.current = { x: event.clientX, y: event.clientY }
    tracking.stop()
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      longPressTriggeredRef.current = true
      window.removeEventListener('pointermove', tracking.onMove)
      window.removeEventListener('pointerup', tracking.onUp)
      window.removeEventListener('pointercancel', tracking.onUp)
      onLongPressRef.current?.()
    }, LONG_PRESS_MS)

    window.addEventListener('pointermove', tracking.onMove)
    window.addEventListener('pointerup', tracking.onUp)
    window.addEventListener('pointercancel', tracking.onUp)
  }

  function handleClick(event) {
    if (longPressTriggeredRef.current) {
      event.preventDefault()
      event.stopPropagation()
      longPressTriggeredRef.current = false
      return
    }

    onClick?.()
  }

  function handleContextMenu(event) {
    if (!onLongPress || isCreate) return
    event.preventDefault()
  }

  return (
    <button
      type="button"
      className={[
        'page-tab',
        isCreate && 'page-tab--create',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      <span className="page-tab-title">
        {!isCreate && <PageIcon />}
        <span className="page-tab-title-text">{title}</span>
      </span>
    </button>
  )
}
