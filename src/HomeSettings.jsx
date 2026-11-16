import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@capawesome/capacitor-dialog'
import { Toast, ToastDuration } from '@capawesome/capacitor-toast'
import {
  exportBackup,
  importBackupFromFile,
  isAbortError,
} from './backup.js'
import FloatingBarToolsReorder from './FloatingBarToolsReorder.jsx'
import {
  FLOATING_BAR_COLOR_OPTIONS,
  getFloatingBarColorLabel,
} from './floatingBarSettings.js'
import { NOTE_CARD_DISPLAY_MODE_LABELS, THEME_LABELS } from './homeSettings.js'
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

const NOTE_CARD_DISPLAY_CHOICES = [
  { id: 'fixed', label: NOTE_CARD_DISPLAY_MODE_LABELS.fixed },
  { id: 'dynamic', label: NOTE_CARD_DISPLAY_MODE_LABELS.dynamic },
]

const THEME_CHOICES = [
  { id: 'dark', label: THEME_LABELS.dark },
  { id: 'light', label: THEME_LABELS.light },
  { id: 'paper', label: THEME_LABELS.paper },
]

function showBackupToast(text) {
  return Toast.show({
    text,
    duration: ToastDuration.Short,
  })
}

export default function HomeSettings({
  isOpen,
  onClose,
  quickBar,
  onQuickBarChange,
  sections,
  onSectionChange,
  noteCardDisplayMode,
  onNoteCardDisplayModeChange,
  theme,
  onThemeChange,
  floatingBarColor,
  onFloatingBarColorChange,
  floatingBarTools,
  onFloatingBarToolsChange,
  onDataImported,
}) {
  const { render, active } = useBottomSheet(isOpen)
  const [step, setStep] = useState('main')
  const [backupBusy, setBackupBusy] = useState(false)
  const importInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) return

    const timer = setTimeout(() => {
      setStep('main')
      setBackupBusy(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  function handleBack() {
    if (
      step === 'quick-bar' ||
      step === 'sections' ||
      step === 'note-cards' ||
      step === 'theme' ||
      step === 'floating-bar-color' ||
      step === 'floating-bar-tools'
    ) {
      setStep('main')
      return
    }

    onClose()
  }

  async function handleExport() {
    if (backupBusy) return

    setBackupBusy(true)

    try {
      await exportBackup()
      await showBackupToast('Settings exported.')
    } catch (error) {
      if (isAbortError(error)) return
      await showBackupToast(error?.message || 'Export failed.')
    } finally {
      setBackupBusy(false)
    }
  }

  function handleImportClick() {
    if (backupBusy) return
    importInputRef.current?.click()
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || backupBusy) return

    const { value } = await Dialog.confirm({
      title: 'Import data?',
      message:
        'This will replace your current notebooks, notes, tags, and settings.',
      okButtonTitle: 'Import',
      cancelButtonTitle: 'Cancel',
    })
    if (!value) return

    setBackupBusy(true)

    try {
      await importBackupFromFile(file)
      await onDataImported?.()
      await showBackupToast('Settings imported.')
    } catch (error) {
      if (isAbortError(error)) return
      await showBackupToast(error?.message || 'Import failed.')
    } finally {
      setBackupBusy(false)
    }
  }

  const selectedQuickBar =
    QUICK_BAR_CHOICES.find((choice) => choice.id === quickBar) ?? QUICK_BAR_CHOICES[0]

  const selectedNoteCardDisplay =
    NOTE_CARD_DISPLAY_CHOICES.find((choice) => choice.id === noteCardDisplayMode) ??
    NOTE_CARD_DISPLAY_CHOICES[0]

  const selectedTheme =
    THEME_CHOICES.find((choice) => choice.id === theme) ?? THEME_CHOICES[0]

  const visibleSectionLabels = SECTION_CHOICES.filter((choice) => sections[choice.id]).map(
    (choice) => choice.label,
  )

  const sectionsSummary =
    visibleSectionLabels.length === SECTION_CHOICES.length
      ? 'All'
      : visibleSectionLabels.length > 0
        ? visibleSectionLabels.join(', ')
        : 'None'

  const selectedFloatingBarColor = getFloatingBarColorLabel(floatingBarColor)

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
            {step === 'quick-bar'
              ? 'Quick bar'
              : step === 'sections'
                ? 'Sections'
                : step === 'note-cards'
                  ? 'Note cards'
                  : step === 'theme'
                    ? 'Theme'
                    : step === 'floating-bar-color'
                      ? 'Floating bar colour'
                      : step === 'floating-bar-tools'
                        ? 'Reorder tools'
                        : 'Settings'}
          </h2>
        </header>

        <div className="home-settings-body">
          {step === 'main' ? (
            <div key="main" className="home-settings-step">
              <h3 className="home-settings-subheading">Appearance</h3>

              <ul className="home-settings-list home-settings-list--grouped">
                <li className="home-settings-item">
                  <button
                    type="button"
                    className="home-settings-nav-button"
                    onClick={() => setStep('theme')}
                  >
                    <span className="home-settings-item-label">Theme</span>
                    <span className="home-settings-nav-meta">
                      <span className="home-settings-item-value">{selectedTheme.label}</span>
                      <span className="home-settings-nav-arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </button>
                </li>
              </ul>

              <div className="home-settings-divider" aria-hidden="true" />

              <h3 className="home-settings-subheading">Customise homepage</h3>

              <ul className="home-settings-list home-settings-list--grouped">
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
                <li className="home-settings-item">
                  <button
                    type="button"
                    className="home-settings-nav-button"
                    onClick={() => setStep('note-cards')}
                  >
                    <span className="home-settings-item-label">Note cards</span>
                    <span className="home-settings-nav-meta">
                      <span className="home-settings-item-value">
                        {selectedNoteCardDisplay.label}
                      </span>
                      <span className="home-settings-nav-arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </button>
                </li>
              </ul>

              <div className="home-settings-divider" aria-hidden="true" />

              <h3 className="home-settings-subheading">Floating bar</h3>

              <ul className="home-settings-list home-settings-list--grouped">
                <li className="home-settings-item">
                  <button
                    type="button"
                    className="home-settings-nav-button"
                    onClick={() => setStep('floating-bar-color')}
                  >
                    <span className="home-settings-item-label">Floating bar colour</span>
                    <span className="home-settings-nav-meta">
                      <span className="home-settings-item-value">{selectedFloatingBarColor}</span>
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
                    onClick={() => setStep('floating-bar-tools')}
                  >
                    <span className="home-settings-item-label">Reorder tools</span>
                    <span className="home-settings-nav-meta">
                      <span className="home-settings-nav-arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </button>
                </li>
              </ul>

              <div className="home-settings-divider" aria-hidden="true" />

              <h3 className="home-settings-subheading">More settings</h3>

              <ul className="home-settings-list home-settings-list--grouped home-settings-list--actions">
                <li className="home-settings-item">
                  <button
                    type="button"
                    className="home-settings-action-button"
                    onClick={handleExport}
                    disabled={backupBusy}
                  >
                    <span className="home-settings-item-label">Backup data</span>
                  </button>
                </li>
                <li className="home-settings-item">
                  <button
                    type="button"
                    className="home-settings-action-button"
                    onClick={handleImportClick}
                    disabled={backupBusy}
                  >
                    <span className="home-settings-item-label">Import data</span>
                  </button>
                </li>
              </ul>

              <input
                ref={importInputRef}
                type="file"
                className="home-settings-import-input"
                accept="application/json,.json"
                onChange={handleImportFileChange}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
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
          ) : step === 'sections' ? (
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
          ) : step === 'floating-bar-color' ? (
            <ul
              key="floating-bar-color"
              className="home-settings-list home-settings-step"
              role="listbox"
              aria-label="Floating bar colour"
            >
              {FLOATING_BAR_COLOR_OPTIONS.map((option) => {
                const selected = option.id === floatingBarColor

                return (
                  <li key={option.id} className="home-settings-item">
                    <button
                      type="button"
                      className={`home-settings-option home-settings-color-option${selected ? ' home-settings-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onFloatingBarColorChange(option.id)}
                    >
                      <span className="home-settings-color-preview">
                        <span
                          className="home-settings-color-swatch"
                          style={{ background: option.background, color: option.foreground }}
                          aria-hidden="true"
                        >
                          B
                        </span>
                        <span className="home-settings-item-label">{option.label}</span>
                      </span>
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
          ) : step === 'floating-bar-tools' ? (
            <div key="floating-bar-tools" className="home-settings-step">
              <FloatingBarToolsReorder
                tools={floatingBarTools}
                colorId={floatingBarColor}
                onToolsChange={onFloatingBarToolsChange}
              />
            </div>
          ) : step === 'note-cards' ? (
            <ul
              key="note-cards"
              className="home-settings-list home-settings-step"
              role="listbox"
              aria-label="Note cards"
            >
              {NOTE_CARD_DISPLAY_CHOICES.map((choice) => {
                const selected = choice.id === noteCardDisplayMode

                return (
                  <li key={choice.id} className="home-settings-item">
                    <button
                      type="button"
                      className={`home-settings-option${selected ? ' home-settings-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onNoteCardDisplayModeChange(choice.id)}
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
          ) : step === 'theme' ? (
            <ul
              key="theme"
              className="home-settings-list home-settings-step"
              role="listbox"
              aria-label="Theme"
            >
              {THEME_CHOICES.map((choice) => {
                const selected = choice.id === theme

                return (
                  <li key={choice.id} className="home-settings-item">
                    <button
                      type="button"
                      className={`home-settings-option${selected ? ' home-settings-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onThemeChange(choice.id)}
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
          ) : null}
        </div>
      </div>
    </>
  )
}
