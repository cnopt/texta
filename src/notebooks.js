import { createId } from './createId.js'
import { readJson, writeJson } from './storage.js'

const FILENAME = 'notebooks.json'

let notebooksCache = null

function rememberNotebooks(notebooks) {
  notebooksCache = notebooks
  return notebooks
}

export function getCachedNotebookById(id) {
  if (!id || !Array.isArray(notebooksCache)) return null
  return notebooksCache.find((notebook) => notebook.id === id) ?? null
}

export async function getNotebooks() {
  try {
    const stored = await readJson(FILENAME, [])
    return rememberNotebooks(Array.isArray(stored) ? stored : [])
  } catch {
    return notebooksCache ?? []
  }
}

export async function getNotebookById(id) {
  const notebooks = await getNotebooks()
  return notebooks.find((notebook) => notebook.id === id) ?? null
}

export async function createNotebook({ name, icon }) {
  const notebooks = await getNotebooks()
  const notebook = {
    id: createId(),
    name: name.trim(),
    icon,
    createdAt: new Date().toISOString(),
    pages: [],
  }

  notebooks.push(notebook)
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)

  return notebook
}

export async function updateNotebook(id, { name, icon }) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === id)
  if (!notebook) return null

  notebook.name = name.trim()
  notebook.icon = icon
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)

  return notebook
}

export async function deleteNotebook(id) {
  const notebooks = await getNotebooks()
  const next = notebooks.filter((item) => item.id !== id)
  if (next.length === notebooks.length) return false

  await writeJson(FILENAME, next)
  rememberNotebooks(next)
  return true
}

export async function createPage(notebookId, { title = 'Untitled' } = {}) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null

  const page = {
    id: createId(),
    title: title.trim() || 'Untitled',
    content: '',
    createdAt: new Date().toISOString(),
  }

  notebook.pages.push(page)
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)

  return page
}

export async function getPageById(notebookId, pageId) {
  const notebook = await getNotebookById(notebookId)
  if (!notebook) return null

  const page = notebook.pages.find((item) => item.id === pageId) ?? null
  if (!page) return null

  return { notebook, page }
}

export async function updatePageContent(notebookId, pageId, content) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null

  const page = notebook.pages.find((item) => item.id === pageId)
  if (!page) return null

  page.content = content
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)

  return page
}

export async function updatePageTitle(notebookId, pageId, title) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null

  const page = notebook.pages.find((item) => item.id === pageId)
  if (!page) return null

  page.title = title.trim() || 'Untitled'
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)

  return page
}

export async function deletePage(notebookId, pageId) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return false

  const nextPages = notebook.pages.filter((item) => item.id !== pageId)
  if (nextPages.length === notebook.pages.length) return false

  notebook.pages = nextPages
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)
  return true
}

export async function reorderPages(notebookId, orderedPageIds) {
  const notebooks = await getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null
  if (!Array.isArray(orderedPageIds)) return notebook

  const byId = new Map(notebook.pages.map((page) => [page.id, page]))
  const nextPages = []
  const seen = new Set()

  for (const pageId of orderedPageIds) {
    const page = byId.get(pageId)
    if (!page || seen.has(pageId)) continue
    nextPages.push(page)
    seen.add(pageId)
  }

  for (const page of notebook.pages) {
    if (!seen.has(page.id)) nextPages.push(page)
  }

  notebook.pages = nextPages
  await writeJson(FILENAME, notebooks)
  rememberNotebooks(notebooks)
  return notebook
}
