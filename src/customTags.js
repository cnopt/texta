import { DEFAULT_TAG_FORMAT } from './tagStyles.js'
import { createId } from './createId.js'

const STORAGE_KEY = 'text-editor-custom-tags'

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

export function getCustomTags() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const tags = stored ? JSON.parse(stored) : []
    return tags.map(normalizeTag)
  } catch {
    return []
  }
}

export function addCustomTag({ trigger, textColor, bold, italic, underline }) {
  const tags = getCustomTags()
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))

  return tag
}

export function updateCustomTag(id, updates) {
  const tags = getCustomTags()
  const index = tags.findIndex((tag) => tag.id === id)
  if (index === -1) return null

  const nextTag = normalizeTag({
    ...tags[index],
    ...updates,
  })

  tags[index] = nextTag
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))

  return nextTag
}

export function deleteCustomTag(id) {
  const tags = getCustomTags().filter((tag) => tag.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))
  return tags
}

export { DEFAULT_TAG_FORMAT }
