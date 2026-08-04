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
import { createEditorTheme, formattingDecorations } from './editorExtensions.js'
import {
  getEditorSettings,
  saveEditorSettings,
} from './editorSettings.js'
import { getFontFamilyStack } from './fontFamilies.js'
import {
  HEADING_FORMATS,
  closeFormatsAndInsertNewline,
  createFormatState,
  getFormatsAt,
  getFormatsForSelection,
  getOpenFormatStack,
  toggleFormat,
  toggleHeadingFormat,
} from './inlineFormat.js'
import { getPageById, updatePageContent } from './notebooks.js'
import './Editor.css'

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
  const { notebookId, pageId } = useParams()
  const navigate = useNavigate()
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const focusSinkRef = useRef(null)
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
    notebookId && pageId ? getPageById(notebookId, pageId) : null,
  )

  const floatingBarVisible = editorFocused && !settingsOpen && !tagsOpen

  // Held in refs so the CodeMirror extensions, which are created once, always
  // call through to the current render's state.
  const handleUpdateRef = useRef(null)
  const handleEnterRef = useRef(null)

  handleUpdateRef.current = (update) => {
    if (update.docChanged && notebookId && pageId) {
      updatePageContent(notebookId, pageId, update.state.doc.toString())
    }

    if (update.docChanged || update.selectionSet) {
      const { from, to } = update.state.selection.main
      const doc = update.state.doc.toString()

      setActiveFormats(
        from === to ? getFormatsAt(doc, from) : getFormatsForSelection(doc, from, to),
      )
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

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          history(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ spellcheck: 'true' }),
          placeholder('Start writing...'),
          Prec.high(
            keymap.of([
              { key: 'Enter', run: (target) => handleEnterRef.current(target) },
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
    if (!notebookId || !pageId) {
      setPageData(null)
      return
    }

    setPageData(getPageById(notebookId, pageId))
  }, [notebookId, pageId])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const content = pageData?.page.content ?? ''
    if (content === view.state.doc.toString()) return

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    })
  }, [pageData])

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

    const listener = Keyboard.addListener('keyboardDidHide', () => {
      const view = viewRef.current
      if (!view || !view.hasFocus) return

      focusSinkRef.current?.focus({ preventScroll: true })
      view.contentDOM.blur()
    })

    return () => {
      listener.then((handle) => handle.remove())
    }
  }, [])

  // The format helpers rebuild the whole string; the spike keeps that simple
  // rather than translating each edit into a minimal change set.
  function applyTextResult(view, result) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: result.text },
      selection: EditorSelection.range(result.selectionStart, result.selectionEnd),
      scrollIntoView: true,
    })
  }

  function handleToggleFormat(format) {
    const view = viewRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    const doc = view.state.doc.toString()

    applyTextResult(
      view,
      HEADING_FORMATS.includes(format)
        ? toggleHeadingFormat(doc, from, to, format)
        : toggleFormat(doc, from, to, format),
    )

    view.focus()
  }

  if (notebookId && pageId && !pageData) {
    return (
      <div className="editor-page">
        <button
          type="button"
          className="editor-back-button"
          onClick={() => navigate(`/notebook/${notebookId}`)}
          aria-label="Go back"
        >
          ←
        </button>
        <p className="editor-missing-text">Page not found.</p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <button
        ref={focusSinkRef}
        type="button"
        className="editor-focus-sink"
        tabIndex={-1}
        aria-hidden="true"
      />

      {notebookId && pageId && (
        <>
          <button
            type="button"
            className="editor-back-button"
            onClick={() => navigate(`/notebook/${notebookId}`)}
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="editor-page-title">{pageData?.page.title}</h1>
        </>
      )}

      <div className="editor-toolbar">
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
