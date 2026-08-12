import { useRef, useState } from 'react'
import FloatingBar from './FloatingBar.jsx'
import {
  FLOATING_BAR_TOOL_LABELS,
  reorderFloatingBarTools,
  setFloatingBarToolEnabled,
} from './floatingBarSettings.js'
import './FloatingBarToolsReorder.css'

function DragHandleIcon() {
  return (
    <svg className="floating-bar-tools-drag-icon" viewBox="0 0 10 16" aria-hidden="true">
      <circle cx="2" cy="2" r="1.35" />
      <circle cx="8" cy="2" r="1.35" />
      <circle cx="2" cy="8" r="1.35" />
      <circle cx="8" cy="8" r="1.35" />
      <circle cx="2" cy="14" r="1.35" />
      <circle cx="8" cy="14" r="1.35" />
    </svg>
  )
}

function getInsertBeforeIndex(listElement, clientY) {
  const items = [...listElement.querySelectorAll('[data-tool-index]')]

  for (let index = 0; index < items.length; index += 1) {
    const rect = items[index].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return index
  }

  return items.length
}

function getReorderIndex(insertBeforeIndex, dragIndex) {
  if (insertBeforeIndex > dragIndex) return insertBeforeIndex - 1
  return insertBeforeIndex
}

export default function FloatingBarToolsReorder({
  tools,
  colorId,
  onToolsChange,
}) {
  const listRef = useRef(null)
  const dragIndexRef = useRef(null)
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [insertBeforeIndex, setInsertBeforeIndex] = useState(null)

  function handleToolEnabledChange(toolId, enabled) {
    onToolsChange(setFloatingBarToolEnabled(tools, toolId, enabled))
  }

  function finishDrag() {
    dragIndexRef.current = null
    setDraggingIndex(null)
    setInsertBeforeIndex(null)
  }

  function handleDragHandlePointerDown(event, index) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragIndexRef.current = index
    setDraggingIndex(index)
    setInsertBeforeIndex(index)
  }

  function handleDragHandlePointerMove(event) {
    const currentDragIndex = dragIndexRef.current
    if (currentDragIndex === null || !listRef.current) return

    event.preventDefault()

    const nextInsertBeforeIndex = getInsertBeforeIndex(listRef.current, event.clientY)
    setInsertBeforeIndex(nextInsertBeforeIndex)

    const nextDropIndex = getReorderIndex(nextInsertBeforeIndex, currentDragIndex)
    if (nextDropIndex !== currentDragIndex) {
      onToolsChange(reorderFloatingBarTools(tools, currentDragIndex, nextDropIndex))
      dragIndexRef.current = nextDropIndex
      setDraggingIndex(nextDropIndex)
    }
  }

  function handleDragHandlePointerUp(event) {
    if (dragIndexRef.current === null) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    finishDrag()
  }

  function handleDragHandlePointerCancel(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    finishDrag()
  }

  return (
    <div className="floating-bar-tools-reorder">
      <div className="floating-bar-tools-preview">
        <FloatingBar preview colorId={colorId} tools={tools} />
      </div>

      <ul
        ref={listRef}
        className={`floating-bar-tools-list${draggingIndex !== null ? ' floating-bar-tools-list--dragging' : ''}`}
        aria-label="Floating bar tools"
      >
        {tools.map((tool, index) => {
          const targetIndex =
            draggingIndex !== null ? getReorderIndex(insertBeforeIndex ?? draggingIndex, draggingIndex) : null
          const showDropBefore =
            targetIndex !== draggingIndex &&
            insertBeforeIndex === index &&
            insertBeforeIndex < tools.length
          const showDropAfter =
            targetIndex !== draggingIndex &&
            insertBeforeIndex === tools.length &&
            index === tools.length - 1

          return (
            <li
              key={tool.id}
              data-tool-index={index}
              className={[
                'floating-bar-tools-item',
                draggingIndex === index && 'floating-bar-tools-item--dragging',
                showDropBefore && 'floating-bar-tools-item--drop-before',
                showDropAfter && 'floating-bar-tools-item--drop-after',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className="floating-bar-tools-drag-handle"
                aria-label={`Reorder ${FLOATING_BAR_TOOL_LABELS[tool.id]}`}
                onPointerDown={(event) => handleDragHandlePointerDown(event, index)}
                onPointerMove={handleDragHandlePointerMove}
                onPointerUp={handleDragHandlePointerUp}
                onPointerCancel={handleDragHandlePointerCancel}
              >
                <DragHandleIcon />
              </button>

              <span className="floating-bar-tools-label">
                {FLOATING_BAR_TOOL_LABELS[tool.id]}
              </span>

              <input
                type="checkbox"
                className="floating-bar-tools-checkbox"
                checked={tool.enabled}
                aria-label={`Show ${FLOATING_BAR_TOOL_LABELS[tool.id]}`}
                onChange={() => handleToolEnabledChange(tool.id, !tool.enabled)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
