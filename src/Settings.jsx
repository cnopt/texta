import { useEffect, useState } from 'react'
import { FONT_FAMILIES } from './fontFamilies.js'
import {
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  TEXT_ALIGNMENTS,
  TEXT_ALIGNMENT_LABELS,
} from './editorSettings.js'
import { useBottomSheet } from './useBottomSheet.js'
import './Settings.css'

export default function Settings({
  isOpen,
  onClose,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  fontFamily,
  onFontFamilyChange,
  textAlignment,
  onTextAlignmentChange,
  displayFormattingMarkers,
  onDisplayFormattingMarkersChange,
  todoSpacing,
  onTodoSpacingChange,
  stayInTodo,
  onStayInTodoChange,
}) {
  const { render, active } = useBottomSheet(isOpen)
  const [step, setStep] = useState('main')

  useEffect(() => {
    if (isOpen) return

    const timer = setTimeout(() => setStep('main'), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  function decreaseFontSize() {
    onFontSizeChange(Math.max(MIN_FONT_SIZE, fontSize - 1))
  }

  function increaseFontSize() {
    onFontSizeChange(Math.min(MAX_FONT_SIZE, fontSize + 1))
  }

  function decreaseLineHeight() {
    onLineHeightChange(Math.max(MIN_LINE_HEIGHT, lineHeight - 1))
  }

  function increaseLineHeight() {
    onLineHeightChange(Math.min(MAX_LINE_HEIGHT, lineHeight + 1))
  }

  function handleBack() {
    if (step === 'font-family' || step === 'alignment') {
      setStep('main')
      return
    }

    onClose()
  }

  const selectedFont =
    FONT_FAMILIES.find((font) => font.id === fontFamily) ?? FONT_FAMILIES[0]

  const settingsTitle =
    step === 'font-family'
      ? 'Font family'
      : step === 'alignment'
        ? 'Alignment'
        : 'Editor Settings'

  return (
    <>
      <div
        className={`settings-backdrop ${active ? 'settings-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`settings-modal ${active ? 'settings-modal--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-header">
          <button
            type="button"
            className="settings-back"
            onClick={handleBack}
            aria-label="Go back"
          >
            ←
          </button>

          <h2 id="settings-title" className="settings-title">
            {settingsTitle}
          </h2>
        </header>

        <div className="settings-body">
          {step === 'main' ? (
            <ul key="main" className="settings-list settings-step">
              <li className="settings-item">
                <span className="settings-item-label">Font size</span>
                <div className="settings-item-controls">
                  <button
                    type="button"
                    className="settings-step-button"
                    onClick={decreaseFontSize}
                    disabled={fontSize <= MIN_FONT_SIZE}
                    aria-label="Decrease font size"
                  >
                    −
                  </button>
                  <span className="settings-item-value">{fontSize}px</span>
                  <button
                    type="button"
                    className="settings-step-button"
                    onClick={increaseFontSize}
                    disabled={fontSize >= MAX_FONT_SIZE}
                    aria-label="Increase font size"
                  >
                    +
                  </button>
                </div>
              </li>

              <li className="settings-item">
                <span className="settings-item-label">Line height</span>
                <div className="settings-item-controls">
                  <button
                    type="button"
                    className="settings-step-button"
                    onClick={decreaseLineHeight}
                    disabled={lineHeight <= MIN_LINE_HEIGHT}
                    aria-label="Decrease line height"
                  >
                    −
                  </button>
                  <span className="settings-item-value">{lineHeight}px</span>
                  <button
                    type="button"
                    className="settings-step-button"
                    onClick={increaseLineHeight}
                    disabled={lineHeight >= MAX_LINE_HEIGHT}
                    aria-label="Increase line height"
                  >
                    +
                  </button>
                </div>
              </li>

              <li className="settings-item">
                <button
                  type="button"
                  className="settings-nav-button"
                  onClick={() => setStep('font-family')}
                >
                  <span className="settings-item-label">Font family</span>
                  <span className="settings-nav-meta">
                    <span className="settings-item-value">{selectedFont.label}</span>
                    <span className="settings-nav-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </button>
              </li>

              <li className="settings-item">
                <button
                  type="button"
                  className="settings-nav-button"
                  onClick={() => setStep('alignment')}
                >
                  <span className="settings-item-label">Alignment</span>
                  <span className="settings-nav-meta">
                    <span className="settings-item-value">
                      {TEXT_ALIGNMENT_LABELS[textAlignment]}
                    </span>
                    <span className="settings-nav-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </button>
              </li>

              <li className="settings-item">
                <span className="settings-item-label" id="settings-markers-label">
                  Display formatting markers
                </span>
                <button
                  type="button"
                  className={`settings-toggle${displayFormattingMarkers ? ' settings-toggle--on' : ''}`}
                  role="switch"
                  aria-checked={displayFormattingMarkers}
                  aria-labelledby="settings-markers-label"
                  onClick={() =>
                    onDisplayFormattingMarkersChange(!displayFormattingMarkers)
                  }
                >
                  <span className="settings-toggle-thumb" aria-hidden="true" />
                </button>
              </li>

              <li className="settings-item">
                <span className="settings-item-label" id="settings-todo-spacing-label">
                  Todo spacing
                </span>
                <button
                  type="button"
                  className={`settings-toggle${todoSpacing ? ' settings-toggle--on' : ''}`}
                  role="switch"
                  aria-checked={todoSpacing}
                  aria-labelledby="settings-todo-spacing-label"
                  onClick={() => onTodoSpacingChange(!todoSpacing)}
                >
                  <span className="settings-toggle-thumb" aria-hidden="true" />
                </button>
              </li>

              <li className="settings-item">
                <span className="settings-item-label" id="settings-stay-in-todo-label">
                  Stay in todo
                </span>
                <button
                  type="button"
                  className={`settings-toggle${stayInTodo ? ' settings-toggle--on' : ''}`}
                  role="switch"
                  aria-checked={stayInTodo}
                  aria-labelledby="settings-stay-in-todo-label"
                  onClick={() => onStayInTodoChange(!stayInTodo)}
                >
                  <span className="settings-toggle-thumb" aria-hidden="true" />
                </button>
              </li>
            </ul>
          ) : step === 'font-family' ? (
            <ul key="font-family" className="settings-list settings-step" role="listbox" aria-label="Font family">
              {FONT_FAMILIES.map((font) => {
                const selected = font.id === selectedFont.id

                return (
                  <li key={font.id} className="settings-item">
                    <button
                      type="button"
                      className={`settings-font-option${selected ? ' settings-font-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      style={{ fontFamily: font.stack }}
                      onClick={() => onFontFamilyChange(font.id)}
                    >
                      <span className="settings-item-label">{font.label}</span>
                      {selected && (
                        <span className="settings-font-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul
              key="alignment"
              className="settings-list settings-step"
              role="listbox"
              aria-label="Alignment"
            >
              {TEXT_ALIGNMENTS.map((alignment) => {
                const selected = alignment === textAlignment

                return (
                  <li key={alignment} className="settings-item">
                    <button
                      type="button"
                      className={`settings-font-option${selected ? ' settings-font-option--selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onTextAlignmentChange(alignment)}
                    >
                      <span className="settings-item-label">
                        {TEXT_ALIGNMENT_LABELS[alignment]}
                      </span>
                      {selected && (
                        <span className="settings-font-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
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
