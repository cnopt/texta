const STORAGE_KEY = 'text-editor-notebooks'

export function getNotebooks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function getNotebookById(id) {
  return getNotebooks().find((notebook) => notebook.id === id) ?? null
}

export function createNotebook({ name, icon }) {
  const notebooks = getNotebooks()
  const notebook = {
    id: crypto.randomUUID(),
    name: name.trim(),
    icon,
    createdAt: new Date().toISOString(),
    pages: [],
  }

  notebooks.push(notebook)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))

  return notebook
}

export function createPage(notebookId, { title = 'Untitled' } = {}) {
  const notebooks = getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null

  const page = {
    id: crypto.randomUUID(),
    title: title.trim() || 'Untitled',
    content: '',
    createdAt: new Date().toISOString(),
  }

  notebook.pages.push(page)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))

  return page
}

export function getPageById(notebookId, pageId) {
  const notebook = getNotebookById(notebookId)
  if (!notebook) return null

  const page = notebook.pages.find((item) => item.id === pageId) ?? null
  if (!page) return null

  return { notebook, page }
}

export function updatePageContent(notebookId, pageId, content) {
  const notebooks = getNotebooks()
  const notebook = notebooks.find((item) => item.id === notebookId)
  if (!notebook) return null

  const page = notebook.pages.find((item) => item.id === pageId)
  if (!page) return null

  page.content = content
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))

  return page
}
