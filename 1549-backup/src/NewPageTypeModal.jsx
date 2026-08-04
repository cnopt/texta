import { useEffect, useState } from 'react'
import { useBottomSheet } from './useBottomSheet.js'
import './NewPageTypeModal.css'

const PAGE_TYPES = [
  {
    id: 'page',
    label: 'Page',
    icon: (
      <svg
        className="new-page-type-icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 3.5h7.2L18.5 7.8V20.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M14 3.5V8h4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 12h7M8.5 15h7M8.5 18h4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export default function NewPageTypeModal({ isOpen, onClose, onCreate }) {
  const { render, active } = useBottomSheet(isOpen)
  const [step, setStep] = useState('select')
  const [selectedType, setSelectedType] = useState(null)
  const [pageName, setPageName] = useState('')

  const canCreate = pageName.trim().length > 0

  useEffect(() => {
    if (isOpen) return

    const timer = setTimeout(() => {
      setStep('select')
      setSelectedType(null)
      setPageName('')
    }, 300)

    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  function handleSelectType(typeId) {
    setSelectedType(typeId)
    setStep('create')
  }

  function handleBack() {
    if (step === 'create') {
      setStep('select')
      setSelectedType(null)
      setPageName('')
      return
    }

    onClose()
  }

  function handleCreate() {
    if (!canCreate || !selectedType) return

    onCreate?.({ type: selectedType, title: pageName.trim() })
    onClose()
  }

  const selectedLabel = PAGE_TYPES.find((type) => type.id === selectedType)?.label ?? 'Page'

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
        aria-labelledby="new-page-type-title"
      >
        {step === 'select' ? (
          <>
            <h2 id="new-page-type-title" className="new-page-type-title">
              + New Page
            </h2>

            <ul className="new-page-type-list">
              {PAGE_TYPES.map((type) => (
                <li key={type.id}>
                  <button
                    type="button"
                    className="new-page-type-item"
                    onClick={() => handleSelectType(type.id)}
                  >
                    <span className="new-page-type-item-icon">{type.icon}</span>
                    <span className="new-page-type-item-label">{type.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <header className="new-page-type-header">
              <button
                type="button"
                className="new-page-type-back"
                onClick={handleBack}
                aria-label="Go back"
              >
                ←
              </button>

              <h2 id="new-page-type-title" className="new-page-type-header-title">
                {selectedLabel}
              </h2>

              <button
                type="button"
                className="new-page-type-submit"
                onClick={handleCreate}
                disabled={!canCreate}
              >
                Create
              </button>
            </header>

            <div className="new-page-type-body">
              <input
                type="text"
                className="new-page-type-input"
                placeholder="Page name"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                autoFocus
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
