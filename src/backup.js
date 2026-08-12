import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getCustomTags } from './customTags.js'
import { getEditorSettings } from './editorSettings.js'
import { getHomeSettings } from './homeSettings.js'
import { getNotebooks } from './notebooks.js'
import { getNotes } from './notes.js'
import { writeJson } from './storage.js'

const BACKUP_FORMAT = 'texta-backup'
const BACKUP_VERSION = 1
const EXPORT_FILENAME = 'Texta-settings.json'

function isAbortError(error) {
  const name = error?.name ?? ''
  const message = String(error?.message ?? error ?? '')
  return (
    name === 'AbortError' ||
    /cancel|abort|dismiss/i.test(message)
  )
}

function buildBackupPayload({
  homeSettings,
  editorSettings,
  notebooks,
  notes,
  customTags,
}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      homeSettings,
      editorSettings,
      notebooks,
      notes,
      customTags,
    },
  }
}

export function isValidBackup(value) {
  if (!value || typeof value !== 'object') return false
  if (value.format !== BACKUP_FORMAT) return false
  if (value.version !== BACKUP_VERSION) return false
  if (!value.data || typeof value.data !== 'object') return false

  const { notebooks, notes } = value.data
  if (notebooks != null && !Array.isArray(notebooks)) return false
  if (notes != null && !Array.isArray(notes)) return false
  if (value.data.customTags != null && !Array.isArray(value.data.customTags)) {
    return false
  }
  if (
    value.data.homeSettings != null &&
    typeof value.data.homeSettings !== 'object'
  ) {
    return false
  }
  if (
    value.data.editorSettings != null &&
    typeof value.data.editorSettings !== 'object'
  ) {
    return false
  }

  return true
}

export async function buildExportJson() {
  const [homeSettings, editorSettings, notebooks, notes, customTags] =
    await Promise.all([
      getHomeSettings(),
      getEditorSettings(),
      getNotebooks(),
      getNotes(),
      getCustomTags(),
    ])

  return JSON.stringify(
    buildBackupPayload({
      homeSettings,
      editorSettings,
      notebooks,
      notes,
      customTags,
    }),
    null,
    2,
  )
}

async function saveWithFilePicker(json) {
  const handle = await window.showSaveFilePicker({
    suggestedName: EXPORT_FILENAME,
    types: [
      {
        description: 'Texta settings',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  const writable = await handle.createWritable()
  await writable.write(json)
  await writable.close()
}

function downloadBlob(json) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = EXPORT_FILENAME
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

async function shareNativeFile(json) {
  await Filesystem.writeFile({
    path: EXPORT_FILENAME,
    directory: Directory.Cache,
    data: json,
    encoding: Encoding.UTF8,
  })

  const { uri } = await Filesystem.getUri({
    path: EXPORT_FILENAME,
    directory: Directory.Cache,
  })

  await Share.share({
    title: 'Texta-settings',
    url: uri,
    dialogTitle: 'Export Texta settings',
  })
}

export async function exportBackup() {
  const json = await buildExportJson()

  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(json)
    return
  }

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      await saveWithFilePicker(json)
      return
    } catch (error) {
      if (isAbortError(error)) throw error
      // Fall through to download if the picker is unavailable or blocked.
    }
  }

  downloadBlob(json)
}

export async function importBackupFromJson(jsonText) {
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid Texta settings file.')
  }

  if (!isValidBackup(parsed)) {
    throw new Error('Invalid Texta settings file.')
  }

  const {
    homeSettings = {},
    editorSettings = {},
    notebooks = [],
    notes = [],
    customTags = [],
  } = parsed.data

  await Promise.all([
    writeJson('homeSettings.json', homeSettings),
    writeJson('editorSettings.json', editorSettings),
    writeJson('notebooks.json', notebooks),
    writeJson('notes.json', notes),
    writeJson('customTags.json', customTags),
  ])
}

export async function importBackupFromFile(file) {
  if (!file) throw new Error('No file selected.')
  const text = await file.text()
  await importBackupFromJson(text)
}

export { EXPORT_FILENAME, isAbortError }
