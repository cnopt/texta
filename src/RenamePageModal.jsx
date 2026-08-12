import { useEffect, useState } from 'react'
import { useBottomSheet } from './useBottomSheet.js'
import './NewPageTypeModal.css'

export default function RenamePageModal({ isOpen, onClose, onSaved, title: initialTitle = '' }) {
  const { render, active } = useBottomSheet(isOpen)
  const [title, setTitle] = useState('')

  const canSave = title.trim().length > 0

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      return
    }

    const timer = setTimeout(() => setTitle(''), 300)
    return () => clearTimeout(timer)
  }, [isOpen, initialTitle])

  if (!render) return null

  function handleSave() {
    if (!canSave) return

    onSaved?.(title.trim())
    onClose()
  }

  return (
    <>
      <div
        className={`new-page-type-backdrop ${active ? 'new-page-type-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`new-page-type-modal ${active ? 'new-page-type-modal--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-page-title"
      >
        <header className="new-page-type-header">
          <button
            type="button"
            className="new-page-type-back"
            onClick={onClose}
            aria-label="Go back"
          >
            ←
          </button>

          <h2 id="rename-page-title" className="new-page-type-header-title">
            Rename page
          </h2>

          <button
            type="button"
            className="new-page-type-submit"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </header>

        <div className="new-page-type-body">
          <input
            type="text"
            className="new-page-type-input"
            placeholder="Page name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    </>
  )
}
