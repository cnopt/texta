import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

const ROOT_DIR = 'Texta'
const directory = Directory.Data

const writeQueues = new Map()
let ensureDirPromise = null

function filePath(filename) {
  return `${ROOT_DIR}/${filename}`
}

async function ensureTextaDir() {
  if (!ensureDirPromise) {
    ensureDirPromise = Filesystem.mkdir({
      path: ROOT_DIR,
      directory,
      recursive: true,
    }).catch((error) => {
      const message = String(error?.message ?? error)
      if (!/already exists|Directory exists/i.test(message)) {
        ensureDirPromise = null
        throw error
      }
    })
  }

  await ensureDirPromise
}

async function readJsonUnlocked(filename, fallback) {
  try {
    const result = await Filesystem.readFile({
      path: filePath(filename),
      directory,
      encoding: Encoding.UTF8,
    })
    const data = typeof result.data === 'string' ? result.data : ''
    if (!data) return fallback
    return JSON.parse(data)
  } catch {
    return fallback
  }
}

async function writeJsonUnlocked(filename, value) {
  await ensureTextaDir()
  await Filesystem.writeFile({
    path: filePath(filename),
    directory,
    data: JSON.stringify(value),
    encoding: Encoding.UTF8,
  })
}

function enqueueWrite(filename, task) {
  const previous = writeQueues.get(filename) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(task)
  writeQueues.set(filename, next)
  return next
}

async function flushWrites(filename) {
  const pending = writeQueues.get(filename)
  if (pending) await pending.catch(() => {})
}

export async function readJson(filename, fallback) {
  await ensureTextaDir()
  await flushWrites(filename)
  return readJsonUnlocked(filename, fallback)
}

export async function writeJson(filename, value) {
  return enqueueWrite(filename, () => writeJsonUnlocked(filename, value))
}

/** Serialize read-modify-write so concurrent updates cannot clobber each other. */
export async function updateJson(filename, updater, fallback) {
  return enqueueWrite(filename, async () => {
    await ensureTextaDir()
    const current = await readJsonUnlocked(filename, fallback)
    const next = await updater(current)
    await writeJsonUnlocked(filename, next)
    return next
  })
}
