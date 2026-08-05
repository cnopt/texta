import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { useNavigate, useParams } from 'react-router-dom'
import { Compartment, EditorSelection, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import CustomTagsModal from './CustomTagsModal.jsx'
import FloatingBar from './FloatingBar.jsx'
import Settings from './Settings.jsx'
import { getCustomTags } from './customTags.js'
import {
  androidEditorSupport,
  createEditorTheme,
  formattingDecorations,
} from './editorExtensions.js'
import {
  getEditorSettings,
  saveEditorSettings,
} from './editorSettings.js'
import { getFontFamilyStack } from './fontFamilies.js'
import {
  HEADING_FORMATS,
  TODO_COMPLETE_FORMAT,
  TODO_FORMAT,
  closeFormatsAndInsertNewline,
  createFormatState,
  deleteTodoPrefix,
  getFormatsAt,
  getFormatsForSelection,
  getOpenFormatStack,
  isTodoCompleteSelection,
  isTodoSelection,
  toggleFormat,
  toggleHeadingFormat,
  toggleTodoComplete,
  toggleTodoItem,
} from './inlineFormat.js'
import { getPageById, updatePageContent } from './notebooks.js'
import { createNote, getNoteById, updateNoteContent } from './notes.js'
import './CircleButton.css'
import './ScreenToolbar.css'
import './Editor.css'

/**
 * The format helpers rebuild the whole string, so trim it back to the range
 * that actually changed. That keeps a toggle as one small step in the undo
 * history instead of a full-document replacement.
 */
function toMinimalChange(previous, next) {
  const maxPrefix = Math.min(previous.length, next.length)
  let from = 0

  while (from < maxPrefix && previous[from] === next[from]) {
    from += 1
  }

  let previousEnd = previous.length
  let nextEnd = next.length

  while (
    previousEnd > from &&
    nextEnd > from &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd -= 1
    nextEnd -= 1
  }

  return { from, to: previousEnd, insert: next.slice(from, nextEnd) }
}

function getEditorTypography(fontSize, fontFamily) {
  const lineHeight = Math.round((fontSize * (26 / 18)) * 10) / 10
  const letterSpacing = ((fontSize * -0.28) / 18).toFixed(2)

  return {
    fontFamily: getFontFamilyStack(fontFamily),
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
    letterSpacing: `${letterSpacing}px`,
  }
}

export default function Editor() {
  const { notebookId, pageId, noteId } = useParams()
  const navigate = useNavigate()
  const isNotebookPage = Boolean(notebookId && pageId)
  const isNewNote = noteId === 'new'
  const isExistingNote = Boolean(noteId && !isNewNote)
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const focusSinkRef = useRef(null)
  const latestContentRef = useRef('')
  const persistedNewNoteRef = useRef(false)
  const themeCompartment = useRef(new Compartment()).current
  const decorationsCompartment = useRef(new Compartment()).current
  const [fontSize, setFontSize] = useState(() => getEditorSettings().fontSize)
  const [fontFamily, setFontFamily] = useState(() => getEditorSettings().fontFamily)
  const [displayFormattingMarkers, setDisplayFormattingMarkers] = useState(
    () => getEditorSettings().displayFormattingMarkers,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [editorFocused, setEditorFocused] = useState(false)
  const [activeFormats, setActiveFormats] = useState(() => createFormatState())
  const [customTags, setCustomTags] = useState(() => getCustomTags())
  const [pageData, setPageData] = useState(() =>
    isNotebookPage ? getPageById(notebookId, pageId) : null,
  )
  const [noteData, setNoteData] = useState(() =>
    isExistingNote ? getNoteById(noteId) : null,
  )

  const floatingBarVisible = editorFocused && !settingsOpen && !tagsOpen

  // Held in refs so the CodeMirror extensions, which are created once, always
  // call through to the current render's state.
  const handleUpdateRef = useRef(null)
  const handleEnterRef = useRef(null)
  const handleBackspaceRef = useRef(null)

  handleUpdateRef.current = (update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString()
      latestContentRef.current = content

      if (isNotebookPage) {
        updatePageContent(notebookId, pageId, content)
      } else if (isExistingNote) {
        updateNoteContent(noteId, content)
      }
    }

    if (update.docChanged || update.selectionSet) {
      const { from, to } = update.state.selection.main
      const doc = update.state.doc.toString()

      setActiveFormats({
        ...(from === to
          ? getFormatsAt(doc, from)
          : getFormatsForSelection(doc, from, to)),
        [TODO_FORMAT]: isTodoSelection(doc, from, to),
        [TODO_COMPLETE_FORMAT]: isTodoCompleteSelection(doc, from, to),
      })
    }

    if (update.focusChanged) {
      setEditorFocused(update.view.hasFocus)
    }
  }

  handleEnterRef.current = (view) => {
    const { from, to } = view.state.selection.main
    if (from !== to) return false

    const doc = view.state.doc.toString()
    if (getOpenFormatStack(doc, from).length === 0) return false

    applyTextResult(view, closeFormatsAndInsertNewline(doc, from))
    return true
  }

  handleBackspaceRef.current = (view) => {
    const { from, to } = view.state.selection.main
    if (from !== to) return false

    const result = deleteTodoPrefix(view.state.doc.toString(), from)
    if (!result) return false

    applyTextResult(view, result)
    return true
  }

  useEffect(() => {
    // EditContext triggers a Chrome Android bug that scrolls the editor to the
    // top when tapping to place the cursor.
    if (Capacitor.getPlatform() === 'android') {
      EditorView.EDIT_CONTEXT = false
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          history(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ spellcheck: 'true' }),
          ...androidEditorSupport(),
          placeholder('Start writing...'),
          Prec.high(
            keymap.of([
              { key: 'Enter', run: (target) => handleEnterRef.current(target) },
              {
                key: 'Backspace',
                run: (target) => handleBackspaceRef.current(target),
              },
            ]),
          ),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((update) => handleUpdateRef.current(update)),
          themeCompartment.of(
            createEditorTheme(getEditorTypography(fontSize, fontFamily)),
          ),
          decorationsCompartment.of(
            formattingDecorations(customTags, displayFormattingMarkers),
          ),
        ],
      }),
      parent: hostRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isNotebookPage) {
      setPageData(null)
      return
    }

    setPageData(getPageById(notebookId, pageId))
  }, [isNotebookPage, notebookId, pageId])

  useEffect(() => {
    if (!isExistingNote) {
      setNoteData(null)
      return
    }

    setNoteData(getNoteById(noteId))
  }, [isExistingNote, noteId])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    let content = ''
    if (isNotebookPage) {
      content = pageData?.page.content ?? ''
    } else if (isExistingNote) {
      content = noteData?.content ?? ''
    }

    latestContentRef.current = content

    if (content === view.state.doc.toString()) return

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    })
  }, [pageData, noteData, isNotebookPage, isExistingNote])

  useEffect(() => {
    persistedNewNoteRef.current = false
    latestContentRef.current = ''
  }, [noteId])

  useEffect(() => {
    return () => {
      if (!isNewNote || persistedNewNoteRef.current) return

      const content = latestContentRef.current.trim()
      if (!content) return

      persistedNewNoteRef.current = true
      createNote({ content })
    }
  }, [isNewNote])

  function persistNewNoteIfNeeded() {
    if (!isNewNote || persistedNewNoteRef.current) return

    const content = latestContentRef.current.trim()
    if (!content) return

    persistedNewNoteRef.current = true
    createNote({ content })
  }

  function handleBack() {
    persistNewNoteIfNeeded()

    if (isNotebookPage) {
      navigate(`/notebook/${notebookId}`)
      return
    }

    navigate('/')
  }

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure(
        createEditorTheme(getEditorTypography(fontSize, fontFamily)),
      ),
    })
  }, [fontSize, fontFamily, themeCompartment])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: decorationsCompartment.reconfigure(
        formattingDecorations(customTags, displayFormattingMarkers),
      ),
    })
  }, [customTags, displayFormattingMarkers, decorationsCompartment])

  useEffect(() => {
    saveEditorSettings({ fontSize, fontFamily, displayFormattingMarkers })
  }, [fontSize, fontFamily, displayFormattingMarkers])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    Keyboard.setResizeMode({ mode: 'body' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listeners = []

    listeners.push(
      Keyboard.addListener('keyboardDidHide', () => {
        const view = viewRef.current
        if (!view || !view.hasFocus) return

        focusSinkRef.current?.focus({ preventScroll: true })
        view.contentDOM.blur()
      }),
    )

    if (Capacitor.getPlatform() === 'android') {
      listeners.push(
        Keyboard.addListener('keyboardDidShow', () => {
          const view = viewRef.current
          if (!view?.hasFocus) return

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!view.hasFocus) return
              const head = view.state.selection.main.head
              view.dispatch({
                effects: EditorView.scrollIntoView(head, { y: 'nearest' }),
              })
            })
          })
        }),
      )
    }

    return () => {
      listeners.forEach((listener) => listener.then((handle) => handle.remove()))
    }
  }, [])

  function applyTextResult(view, result) {
    view.dispatch({
      changes: toMinimalChange(view.state.doc.toString(), result.text),
      selection: EditorSelection.range(result.selectionStart, result.selectionEnd),
      scrollIntoView: true,
    })
  }

  function handleToggleFormat(format) {
    const view = viewRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    const doc = view.state.doc.toString()

    if (format === TODO_FORMAT) {
      applyTextResult(view, toggleTodoItem(doc, from, to))
      view.focus()
      return
    }

    if (format === TODO_COMPLETE_FORMAT) {
      applyTextResult(view, toggleTodoComplete(doc, from, to))
      view.focus()
      return
    }

    applyTextResult(
      view,
      HEADING_FORMATS.includes(format)
        ? toggleHeadingFormat(doc, from, to, format)
        : toggleFormat(doc, from, to, format),
    )

    view.focus()
  }

  if (isNotebookPage && !pageData) {
    return (
      <div className="editor-page screen-page">
        <header className="screen-toolbar editor-header">
          <button
            type="button"
            className="circle-button"
            onClick={() => navigate(`/notebook/${notebookId}`)}
            aria-label="Go back"
          >
            ←
          </button>
        </header>
        <p className="editor-missing-text">Page not found.</p>
      </div>
    )
  }

  if (isExistingNote && !noteData) {
    return (
      <div className="editor-page screen-page">
        <header className="screen-toolbar editor-header">
          <button
            type="button"
            className="circle-button"
            onClick={() => navigate('/')}
            aria-label="Go back"
          >
            ←
          </button>
        </header>
        <p className="editor-missing-text">Note not found.</p>
      </div>
    )
  }

  return (
    <div className="editor-page screen-page">
      <button
        ref={focusSinkRef}
        type="button"
        className="editor-focus-sink"
        tabIndex={-1}
        aria-hidden="true"
      />

      <header className="screen-toolbar editor-header">
        {(isNotebookPage || noteId) ? (
          <button
            type="button"
            className="circle-button"
            onClick={handleBack}
            aria-label="Go back"
          >
            ←
          </button>
        ) : (
          <span className="editor-header-spacer" aria-hidden="true" />
        )}

        {isNotebookPage && (
          <h1 className="editor-page-title">{pageData?.page.title}</h1>
        )}

        <div className="editor-header-actions">
          <button
            type="button"
            className="editor-toolbar-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⛭
          </button>

          <button
            type="button"
            className="editor-toolbar-button"
            onClick={() => setTagsOpen(true)}
            aria-label="Open custom tags"
          >
            #
          </button>
        </div>
      </header>

      <div className="editor-shell">
        <div ref={hostRef} className="editor-host" />
      </div>

      <FloatingBar
        visible={floatingBarVisible}
        activeFormats={activeFormats}
        onToggleFormat={handleToggleFormat}
      />

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        displayFormattingMarkers={displayFormattingMarkers}
        onDisplayFormattingMarkersChange={setDisplayFormattingMarkers}
      />

      <CustomTagsModal
        isOpen={tagsOpen}
        onClose={() => setTagsOpen(false)}
        onTagsChange={setCustomTags}
        fontFamily={fontFamily}
      />
    </div>
  )
}
