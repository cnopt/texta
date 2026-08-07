import { createId } from './createId.js'
import { readJson, updateJson } from './storage.js'

const FILENAME = 'notes.json'

export async function getNotes() {
  try {
    const stored = await readJson(FILENAME, [])
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export async function getNoteById(id) {
  const notes = await getNotes()
  return notes.find((note) => note.id === id) ?? null
}

export async function createNote({ content = '' } = {}) {
  const timestamp = new Date().toISOString()
  const note = {
    id: createId(),
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await updateJson(
    FILENAME,
    (stored) => {
      const notes = Array.isArray(stored) ? stored : []
      notes.push(note)
      return notes
    },
    [],
  )

  return note
}

export async function updateNoteContent(id, content) {
  let updated = null

  await updateJson(
    FILENAME,
    (stored) => {
      const notes = Array.isArray(stored) ? stored : []
      const note = notes.find((item) => item.id === id)
      if (!note) return notes

      note.content = content
      note.updatedAt = new Date().toISOString()
      updated = note
      return notes
    },
    [],
  )

  return updated
}

export async function deleteNote(id) {
  let removed = false

  await updateJson(
    FILENAME,
    (stored) => {
      const notes = Array.isArray(stored) ? stored : []
      const next = notes.filter((item) => item.id !== id)
      removed = next.length !== notes.length
      return next
    },
    [],
  )

  return removed
}
