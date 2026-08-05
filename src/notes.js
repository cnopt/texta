import { createId } from './createId.js'

const STORAGE_KEY = 'text-editor-notes'

export function getNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function getNoteById(id) {
  return getNotes().find((note) => note.id === id) ?? null
}

export function createNote({ content = '' } = {}) {
  const notes = getNotes()
  const timestamp = new Date().toISOString()
  const note = {
    id: createId(),
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  notes.push(note)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))

  return note
}

export function updateNoteContent(id, content) {
  const notes = getNotes()
  const note = notes.find((item) => item.id === id)
  if (!note) return null

  note.content = content
  note.updatedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))

  return note
}

export function deleteNote(id) {
  const notes = getNotes()
  const next = notes.filter((item) => item.id !== id)
  if (next.length === notes.length) return false

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return true
}
