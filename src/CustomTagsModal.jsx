import { useEffect, useState } from 'react'
import {
  addCustomTag,
  DEFAULT_TAG_FORMAT,
  deleteCustomTag,
  getCustomTags,
  updateCustomTag,
} from './customTags.js'
import { getTagStyle } from './tagStyles.js'
import { getFontFamilyStack } from './fontFamilies.js'
import { DEFAULT_SETTINGS } from './editorSettings.js'
import { useBottomSheet } from './useBottomSheet.js'
import './CustomTagsModal.css'

const DEFAULT_TEXT_COLOR = '#ebebeb'

const EMPTY_FORM = {
  trigger: '',
  textColor: DEFAULT_TEXT_COLOR,
  caseSensitive: false,
  ...DEFAULT_TAG_FORMAT,
}

function FormatToggleButtons({ bold, italic, underline, onChange }) {
  return (
    <div className="custom-tags-format-buttons">
      <button
        type="button"
        className={`custom-tags-format-button custom-tags-format-button--bold${bold ? ' custom-tags-format-button--active' : ''}`}
        aria-pressed={bold}
        aria-label="Bold"
        onClick={() => onChange({ bold: !bold })}
      >
        B
      </button>
      <button
        type="button"
        className={`custom-tags-format-button custom-tags-format-button--italic${italic ? ' custom-tags-format-button--active' : ''}`}
        aria-pressed={italic}
        aria-label="Italic"
        onClick={() => onChange({ italic: !italic })}
      >
        I
      </button>
      <button
        type="button"
        className={`custom-tags-format-button custom-tags-format-button--underline${underline ? ' custom-tags-format-button--active' : ''}`}
        aria-pressed={underline}
        aria-label="Underline"
        onClick={() => onChange({ underline: !underline })}
      >
        U
      </button>
    </div>
  )
}

export default function CustomTagsModal({ isOpen, onClose, onTagsChange, fontFamily }) {
  const { render, active } = useBottomSheet(isOpen)
  const [step, setStep] = useState('list')
  const [tags, setTags] = useState([])
  const [editingTagId, setEditingTagId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const isEditing = step === 'edit'
  const canCreate = form.trigger.trim().length > 0
  const previewFontFamily = getFontFamilyStack(
    fontFamily ?? DEFAULT_SETTINGS.fontFamily,
  )

  const previewTag = {
    textColor: form.textColor,
    bold: form.bold,
    italic: form.italic,
    underline: form.underline,
  }

  useEffect(() => {
    if (isOpen) {
      let cancelled = false

      getCustomTags().then((nextTags) => {
        if (!cancelled) setTags(nextTags)
      })

      return () => {
        cancelled = true
      }
    }

    const timer = setTimeout(() => {
      setStep('list')
      setEditingTagId(null)
      setForm(EMPTY_FORM)
    }, 300)

    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  async function refreshTags() {
    const nextTags = await getCustomTags()
    setTags(nextTags)
    onTagsChange?.(nextTags)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingTagId(null)
  }

  function handleBack() {
    if (step === 'create' || step === 'edit') {
      setStep('list')
      resetForm()
      return
    }

    onClose()
  }

  function openCreate() {
    resetForm()
    setStep('create')
  }

  function openEdit(tag) {
    setEditingTagId(tag.id)
    setForm({
      trigger: tag.trigger,
      textColor: tag.textColor || DEFAULT_TEXT_COLOR,
      bold: tag.bold,
      italic: tag.italic,
      underline: tag.underline,
      caseSensitive: Boolean(tag.caseSensitive),
    })
    setStep('edit')
  }

  async function handleFormChange(updates) {
    setForm((current) => ({ ...current, ...updates }))

    if (isEditing && editingTagId) {
      await updateCustomTag(editingTagId, updates)
      await refreshTags()
    }
  }

  async function handleCreate() {
    if (!canCreate) return

    const created = await addCustomTag({
      trigger: form.trigger.trim(),
      textColor: form.textColor,
      bold: form.bold,
      italic: form.italic,
      underline: form.underline,
      caseSensitive: form.caseSensitive,
    })

    if (!created) return

    await refreshTags()
    setStep('list')
    resetForm()
  }

  async function handleDeleteTag(id) {
    await deleteCustomTag(id)
    await refreshTags()

    if (editingTagId === id) {
      setStep('list')
      resetForm()
    }
  }

  return (
    <>
      <div
        className={`custom-tags-backdrop ${active ? 'custom-tags-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`custom-tags-modal ${active ? 'custom-tags-modal--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-tags-title"
      >
        <header className="custom-tags-header">
          <button
            type="button"
            className="custom-tags-back"
            onClick={handleBack}
            aria-label="Go back"
          >
            ←
          </button>

          <h2 id="custom-tags-title" className="custom-tags-title">
            {step === 'list' ? 'Custom Tags' : step === 'edit' ? 'Edit Tag' : 'New Tag'}
          </h2>

          {step === 'create' && (
            <button
              type="button"
              className="custom-tags-submit"
              onClick={() => void handleCreate()}
              disabled={!canCreate}
            >
              Create
            </button>
          )}
        </header>

        <div className="custom-tags-body">
          {step === 'list' ? (
            <div key="list" className="custom-tags-step">
              {tags.length > 0 ? (
                <ul className="custom-tags-list">
                  {tags.map((tag) => (
                    <li key={tag.id} className="custom-tags-item">
                      <button
                        type="button"
                        className="custom-tags-item-main"
                        onClick={() => openEdit(tag)}
                      >
                        <span className="custom-tags-item-trigger" style={getTagStyle(tag)}>
                          {tag.trigger}
                        </span>
                        <div className="custom-tags-item-meta">
                          {tag.textColor && (
                            <span
                              className="custom-tags-swatch"
                              style={{ backgroundColor: tag.textColor }}
                              title="Text colour"
                            />
                          )}
                          {tag.bold && <span className="custom-tags-format-badge">B</span>}
                          {tag.italic && <span className="custom-tags-format-badge">I</span>}
                          {tag.underline && <span className="custom-tags-format-badge">U</span>}
                        </div>
                      </button>

                      <button
                        type="button"
                        className="custom-tags-delete"
                        onClick={() => void handleDeleteTag(tag.id)}
                        aria-label={`Delete tag ${tag.trigger}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="custom-tags-empty">No custom tags yet.</p>
              )}

              <button
                type="button"
                className="custom-tags-new-button"
                onClick={openCreate}
              >
                + New tag
              </button>
            </div>
          ) : (
            <div key={step} className="custom-tags-step">
              <label className="custom-tags-field">
                <span className="custom-tags-field-label">Tag trigger</span>
                <input
                  type="text"
                  className="custom-tags-input"
                  placeholder='e.g. i:'
                  value={form.trigger}
                  onChange={(e) => void handleFormChange({ trigger: e.target.value })}
                  disabled={isEditing}
                  autoFocus={!isEditing}
                />
              </label>

              <p className="custom-tags-hint">
                Styling activates after the trigger and a space, and continues to the end of the line.
              </p>

              <div className="custom-tags-field">
                <span className="custom-tags-field-label">Text colour</span>
                <div className="custom-tags-color-row">
                  <input
                    type="color"
                    className="custom-tags-color-input"
                    value={form.textColor}
                    onChange={(e) => void handleFormChange({ textColor: e.target.value })}
                    aria-label="Text colour"
                  />
                  <span className="custom-tags-color-value">{form.textColor}</span>
                </div>
              </div>

              <div className="custom-tags-formatting-row">
                <span className="custom-tags-field-label">Text formatting</span>
                <FormatToggleButtons
                  bold={form.bold}
                  italic={form.italic}
                  underline={form.underline}
                  onChange={(updates) => void handleFormChange(updates)}
                />
              </div>

              <div className="custom-tags-formatting-row">
                <span className="custom-tags-field-label" id="custom-tags-case-label">
                  Case sensitive
                </span>
                <button
                  type="button"
                  className={`custom-tags-toggle${form.caseSensitive ? ' custom-tags-toggle--on' : ''}`}
                  role="switch"
                  aria-checked={form.caseSensitive}
                  aria-labelledby="custom-tags-case-label"
                  onClick={() => void handleFormChange({ caseSensitive: !form.caseSensitive })}
                >
                  <span className="custom-tags-toggle-thumb" aria-hidden="true" />
                </button>
              </div>

              <div className="custom-tags-preview">
                <span className="custom-tags-field-label">Preview</span>
                <p
                  className="custom-tags-preview-text"
                  style={{ fontFamily: previewFontFamily }}
                >
                  <span style={getTagStyle(previewTag)}>
                    {form.trigger.trim() || 'trigger'} example text
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
