let leaveHandler = null

export function setEditorLeaveHandler(handler) {
  leaveHandler = handler
}

export async function runEditorLeaveHandler() {
  if (leaveHandler) await leaveHandler()
}
