let backHandler = null

export function setNotebookHomeBackHandler(handler) {
  backHandler = handler
}

export function runNotebookHomeBackHandler() {
  if (!backHandler) return false
  backHandler()
  return true
}
