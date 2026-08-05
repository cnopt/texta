import { useEffect, useState } from 'react'
import { useBottomSheet } from './useBottomSheet.js'
import './HomeSettings.css'

const QUICK_BAR_CHOICES = [
  { id: 'search', label: 'Search bar' },
  { id: 'new-note', label: 'New note bar' },
]

const SECTION_CHOICES = [
  { id: 'notebooks', label: 'Notebooks' },
  { id: 'notes', label: 'Notes' },
]

export default function HomeSettings({
  isOpen,
  onClose,
  quickBar,
  onQuickBarChange,
  sections,
  onSectionChange,
}) {
  const { render, active } = useBottomSheet(isOpen)
  const [step, setStep] = useState('main')

  useEffect(() => {
    if (isOpen) return

    const timer = setTimeout(() => setStep('main'), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  function handleBack() {
    if (step === 'quick-bar' || step === 'sections') {
      setStep('main')
      return
    }

    onClose()
  }

  const selectedQuickBar =
    QUICK_BAR_CHOICES.find((choice) => choice.id === quickBar) ?? QUICK_BAR_CHOICES[0]

  const visibleSectionLabels = SECTION_CHOICES.filter((choice) => sections[choice.id]).map(
    (choice) => choice.label,
  )

  const sectionsSummary =
    visibleSectionLabels.length === SECTION_CHOICES.length
      ? 'All'
      : visibleSectionLabels.length > 0
        ? visibleSectionLabels.join(', ')
        : 'None'

  return (
    <>
      <div
        className={`home-settings-backdrop ${active ? 'home-settings-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`home-settings-modal ${active ? 'home-settings-modal--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-settings-title"
      >
        <header className="home-settings-header">
          <button
            type="button"
            className="home-settings-back"
            onClick={handleBack}
            aria-label="Go back"
          >
            ←
          </button>

          <h2 id="home-settings-title" className="home-settings-title">
            {step === 'quick-bar' ? 'Quick bar' : step === 'sections' ? 'Sections' : 'Customise homepage'}
          </h2>
        </header>

        <div className="home-settings-body">
          {step === 'main' ? (
            <ul key="main" className="home-settings-list home-settings-step">
              <li className="home-settings-item">
                <button
                  type="button"
                  className="home-settings-nav-button"
                  onClick={() => setStep('quick-bar')}
                >
                  <span className="home-settings-item-label">Quick bar</span>
                  <span className="home-settings-nav-meta">
                    <span className="home-settings-item-value">{selectedQuickBar.label}</span>
                    <span className="home-settings-nav-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </button>
              </li>
              <li className="home-settings-item">
                <button
                  type="button"
                  className="home-settings-nav-button"
                  onClick={() => setStep('sections')}
                >
                  <span className="home-settings-item-label">Sections</span>
                  <span className="home-settings-nav-meta">
                    <span className="home-settings-item-value">{sectionsSummary}</span>
                    <span className="home-settings-nav-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          ) : step === 'quick-bar' ? (
            <ul
              key="quick-bar"
              className="home-settings-list home-settings-step"
              role="listbox"
              aria-label="Quick bar"
            >
              {QUICK_BAR_CHOICES.map((choice) => {
                const selected = choice.id === quickBar

                return (
                  <li key={choice.id} className="home-settings-item">
                    <button
                      type="button"
                      className={`home-settings-option${selected ? ' home-settings-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onQuickBarChange(choice.id)}
                    >
                      <span className="home-settings-item-label">{choice.label}</span>
                      {selected && (
                        <span className="home-settings-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul key="sections" className="home-settings-list home-settings-step" aria-label="Sections">
              {SECTION_CHOICES.map((choice) => {
                const checked = sections[choice.id]

                return (
                  <li key={choice.id} className="home-settings-item">
                    <label className="home-settings-checkbox-label">
                      <span className="home-settings-item-label">{choice.label}</span>
                      <input
                        type="checkbox"
                        className="home-settings-checkbox"
                        checked={checked}
                        onChange={() => onSectionChange(choice.id, !checked)}
                      />
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
