import { useEffect, useState } from 'react'
import { createNotebook, updateNotebook } from './notebooks.js'
import NotebookIcon from './NotebookIcon.jsx'
import { useBottomSheet } from './useBottomSheet.js'
import './CreateNotebook.css'

const ICON_COLORS = [
  '#1a5c52',
  '#2a4478',
  '#5a3d8f',
  '#7a5a1a',
  '#8a3d52',
  '#2d6b3a',
  '#1a6678',
  '#6b3a2a',
]

function pickRandomColor() {
  return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)]
}

export default function CreateNotebook({ isOpen, onClose, onCreated, notebook }) {
  const isRename = Boolean(notebook)
  const [name, setName] = useState('')
  const [iconColor, setIconColor] = useState(pickRandomColor)
  const { render, active } = useBottomSheet(isOpen)

  const letter = name.trim().charAt(0).toUpperCase()
  const canSubmit = name.trim().length > 0

  useEffect(() => {
    if (isOpen) {
      if (notebook) {
        setName(notebook.name)
        setIconColor(notebook.icon)
      } else {
        setName('')
        setIconColor(pickRandomColor())
      }
      return
    }

    const timer = setTimeout(() => setName(''), 300)
    return () => clearTimeout(timer)
  }, [isOpen, notebook])

  if (!render) return null

  async function handleSubmit() {
    if (!canSubmit) return

    if (isRename) {
      const updated = await updateNotebook(notebook.id, { name, icon: iconColor })
      onCreated?.(updated)
    } else {
      const created = await createNotebook({ name, icon: iconColor })
      onCreated?.(created)
    }

    onClose()
  }

  return (
    <>
      <div
        className={`create-notebook-backdrop ${active ? 'create-notebook-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`create-notebook ${active ? 'create-notebook--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-notebook-title"
      >
        <header className="create-notebook-header">
          <button
            type="button"
            className="create-notebook-back"
            onClick={onClose}
            aria-label="Go back"
          >
            ←
          </button>

          <h2 id="create-notebook-title" className="create-notebook-title">
            {isRename ? 'Rename Notebook' : 'New Notebook'}
          </h2>

          <button
            type="button"
            className="create-notebook-submit"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isRename ? 'Save' : 'Create'}
          </button>
        </header>

        <div className="create-notebook-body">
          <NotebookIcon color={iconColor} letter={letter} />

          <input
            type="text"
            className="create-notebook-input"
            placeholder="Notebook name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    </>
  )
}
