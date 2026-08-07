import { DEFAULT_TAG_FORMAT } from './tagStyles.js'
import { createId } from './createId.js'
import { readJson, writeJson } from './storage.js'

const FILENAME = 'customTags.json'

function normalizeTag(tag) {
  return {
    id: tag.id,
    trigger: tag.trigger,
    textColor: tag.textColor || null,
    bold: Boolean(tag.bold),
    italic: Boolean(tag.italic),
    underline: Boolean(tag.underline),
    createdAt: tag.createdAt,
  }
}

export async function getCustomTags() {
  try {
    const stored = await readJson(FILENAME, [])
    const tags = Array.isArray(stored) ? stored : []
    return tags.map(normalizeTag)
  } catch {
    return []
  }
}

export async function addCustomTag({ trigger, textColor, bold, italic, underline }) {
  const tags = await getCustomTags()
  const trimmedTrigger = trigger.trim()

  if (!trimmedTrigger || !textColor) return null
  if (tags.some((tag) => tag.trigger === trimmedTrigger)) return null

  const tag = normalizeTag({
    id: createId(),
    trigger: trimmedTrigger,
    textColor,
    bold,
    italic,
    underline,
    createdAt: new Date().toISOString(),
  })

  tags.push(tag)
  await writeJson(FILENAME, tags)

  return tag
}

export async function updateCustomTag(id, updates) {
  const tags = await getCustomTags()
  const index = tags.findIndex((tag) => tag.id === id)
  if (index === -1) return null

  const nextTag = normalizeTag({
    ...tags[index],
    ...updates,
  })

  tags[index] = nextTag
  await writeJson(FILENAME, tags)

  return nextTag
}

export async function deleteCustomTag(id) {
  const tags = (await getCustomTags()).filter((tag) => tag.id !== id)
  await writeJson(FILENAME, tags)
  return tags
}

export { DEFAULT_TAG_FORMAT }
