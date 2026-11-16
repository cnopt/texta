import { DEFAULT_TAG_FORMAT } from './tagStyles.js'
import { createId } from './createId.js'
import { readJson, writeJson } from './storage.js'

const FILENAME = 'customTags.json'

export const TAG_MODE_LINE = 'line'
export const TAG_MODE_WORD = 'word'
export const DEFAULT_TAG_MODE = TAG_MODE_WORD

export function normalizeTagMode(mode) {
  return mode === TAG_MODE_WORD ? TAG_MODE_WORD : TAG_MODE_LINE
}

function normalizeTag(tag) {
  return {
    id: tag.id,
    trigger: tag.trigger,
    textColor: tag.textColor || null,
    bold: Boolean(tag.bold),
    italic: Boolean(tag.italic),
    underline: Boolean(tag.underline),
    caseSensitive: Boolean(tag.caseSensitive),
    mode: normalizeTagMode(tag.mode),
    createdAt: tag.createdAt,
  }
}

function indexOfTrigger(line, trigger, caseSensitive, fromIndex) {
  if (fromIndex >= line.length) return -1

  if (caseSensitive) {
    return line.indexOf(trigger, fromIndex)
  }

  return line.toLowerCase().indexOf(trigger.toLowerCase(), fromIndex)
}

function getTagMatchEnd(line, index, triggerLength, mode) {
  if (normalizeTagMode(mode) !== TAG_MODE_WORD) {
    return line.length
  }

  const spaceIndex = line.indexOf(' ', index + triggerLength)
  return spaceIndex === -1 ? line.length : spaceIndex
}

/**
 * Finds non-overlapping custom tag ranges on a single line.
 * Line-mode tags run to the end of the line; word-mode tags stop at the next space.
 */
export function collectLineTagMatches(line, tags) {
  const matches = []
  if (!line || !tags.length) return matches

  const sortedTags = [...tags]
    .filter((tag) => tag.trigger)
    .sort((a, b) => b.trigger.length - a.trigger.length)

  let cursor = 0

  while (cursor < line.length) {
    let earliest = null

    for (const tag of sortedTags) {
      const index = indexOfTrigger(line, tag.trigger, tag.caseSensitive, cursor)
      if (index === -1) continue
      if (!earliest || index < earliest.index) {
        earliest = { tag, index }
      }
    }

    if (!earliest) break

    const from = earliest.index
    const triggerEnd = from + earliest.tag.trigger.length
    const to = getTagMatchEnd(line, from, earliest.tag.trigger.length, earliest.tag.mode)

    if (to > from) {
      matches.push({ tag: earliest.tag, from, to })
    }

    if (normalizeTagMode(earliest.tag.mode) === TAG_MODE_LINE || to >= line.length) {
      break
    }

    const nextCursor = Math.max(to, triggerEnd)
    cursor = nextCursor > cursor ? nextCursor : cursor + 1
  }

  return matches
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

export async function addCustomTag({
  trigger,
  textColor,
  bold,
  italic,
  underline,
  caseSensitive = false,
  mode = DEFAULT_TAG_MODE,
}) {
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
    caseSensitive,
    mode,
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

  const nextUpdates = { ...updates }
  if (typeof nextUpdates.trigger === 'string') {
    const trimmedTrigger = nextUpdates.trigger.trim()
    if (!trimmedTrigger) return null
    if (tags.some((tag) => tag.id !== id && tag.trigger === trimmedTrigger)) return null
    nextUpdates.trigger = trimmedTrigger
  }

  const nextTag = normalizeTag({
    ...tags[index],
    ...nextUpdates,
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
