import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { useNavigate, useParams } from 'react-router-dom'
import CustomTagsModal from './CustomTagsModal.jsx'
import FloatingBar from './FloatingBar.jsx'
import Settings from './Settings.jsx'
import { getCustomTags } from './customTags.js'
import {
  getEditorSettings,
  saveEditorSettings,
} from './editorSettings.js'
import { getFontFamilyStack } from './fontFamilies.js'
import {
  HEADING_FORMATS,
  applyDisplayTextChange,
  closeFormatsAndInsertNewline,
  createFormatState,
  getDisplayText,
  getFormatsAt,
  getFormatsForSelection,
  getOpenFormatStack,
  mapDisplaySelectionToStorage,
  mapStorageSelectionToDisplay,
  toggleFormat,
  toggleHeadingFormat,
} from './inlineFormat.js'
import { getPageById, updatePageContent } from './notebooks.js'
import { renderTaggedContent } from './taggedText.jsx'
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
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)
  const focusSinkRef = useRef(null)
  const storageSelectionRef = useRef({ start: 0, end: 0 })
  const pendingDisplaySelectionRef = useRef(null)
  const pendingScrollTopRef = useRef(null)
  const [text, setText] = useState('')
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

  useEffect(() => {
    if (!notebookId || !pageId) {
      setPageData(null)
      return
    }

    const data = getPageById(notebookId, pageId)
    setPageData(data)
    setText(data?.page.content ?? '')
  }, [notebookId, pageId])

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
      const textarea = textareaRef.current
      if (!textarea || document.activeElement !== textarea) return

      focusSinkRef.current?.focus({ preventScroll: true })
      textarea.blur()
    })

    return () => {
      listener.then((handle) => handle.remove())
    }
  }, [])

  function syncScroll() {
    if (!textareaRef.current || !highlightRef.current) return

    highlightRef.current.scrollTop = textareaRef.current.scrollTop
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
  }

  // Re-rendering a controlled textarea can drop the caret and the scroll offset
  // the browser already picked, so both are restored before the frame paints.
  useLayoutEffect(() => {
    const pending = pendingDisplaySelectionRef.current
    if (!pending) return

    const textarea = textareaRef.current
    if (!textarea) return

    textarea.setSelectionRange(pending.start, pending.end)
    pendingDisplaySelectionRef.current = null

    if (pendingScrollTopRef.current != null) {
      textarea.scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
    }

    syncScroll()
  })

  function persistText(value) {
    setText(value)

    if (notebookId && pageId) {
      updatePageContent(notebookId, pageId, value)
    }
  }

  function queueDisplaySelection(start, end) {
    pendingDisplaySelectionRef.current = { start, end }
  }

  function getTextareaStorageSelection() {
    const textarea = textareaRef.current
    if (!textarea) {
      return storageSelectionRef.current
    }

    if (displayFormattingMarkers) {
      const selection = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      }
      storageSelectionRef.current = selection
      return selection
    }

    const displayStart = textarea.selectionStart
    const displayEnd = textarea.selectionEnd
    const stored = storageSelectionRef.current

    if (displayStart === displayEnd && stored.start === stored.end) {
      const storedDisplay = mapStorageSelectionToDisplay(
        text,
        stored.start,
        stored.end,
      )
      if (storedDisplay.start === displayStart) {
        return stored
      }
    }

    const mapped = mapDisplaySelectionToStorage(text, displayStart, displayEnd)
    storageSelectionRef.current = mapped
    return mapped
  }

  function applyEditorUpdate({ text: nextText, selectionStart, selectionEnd }) {
    storageSelectionRef.current = {
      start: selectionStart,
      end: selectionEnd,
    }

    const displaySelection = displayFormattingMarkers
      ? { start: selectionStart, end: selectionEnd }
      : mapStorageSelectionToDisplay(nextText, selectionStart, selectionEnd)

    queueDisplaySelection(displaySelection.start, displaySelection.end)
    persistText(nextText)
    syncFormatState(nextText, selectionStart, selectionEnd)
  }

  function syncFormatState(currentText, start, end) {
    storageSelectionRef.current = { start, end }

    const formats =
      start === end
        ? getFormatsAt(currentText, start)
        : getFormatsForSelection(currentText, start, end)

    setActiveFormats(formats)
  }

  function handleTextChange(event) {
    const value = event.target.value
    const selectionStart = event.target.selectionStart
    const selectionEnd = event.target.selectionEnd

    // The browser has already scrolled the caret into view at this point.
    pendingScrollTopRef.current = event.target.scrollTop

    if (displayFormattingMarkers) {
      persistText(value)
      syncFormatState(value, selectionStart, selectionEnd)
      return
    }

    const previousDisplay = getDisplayText(text, false)
    const isInsert = value.length > previousDisplay.length
    const preferredCaret =
      isInsert &&
      storageSelectionRef.current.start === storageSelectionRef.current.end
        ? storageSelectionRef.current.start
        : null
    const result = applyDisplayTextChange(
      text,
      previousDisplay,
      value,
      preferredCaret,
    )
    const expectedDisplay = mapStorageSelectionToDisplay(
      result.text,
      result.selectionStart,
      result.selectionEnd,
    )

    queueDisplaySelection(expectedDisplay.start, expectedDisplay.end)
    persistText(result.text)
    syncFormatState(result.text, result.selectionStart, result.selectionEnd)
  }

  function handleSelect() {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end } = getTextareaStorageSelection()
    syncFormatState(text, start, end)
  }

  function handleToggleFormat(format) {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end } = getTextareaStorageSelection()

    if (HEADING_FORMATS.includes(format)) {
      applyEditorUpdate(toggleHeadingFormat(text, start, end, format))
      return
    }

    applyEditorUpdate(toggleFormat(text, start, end, format))
  }

  function handleEditorKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end } = getTextareaStorageSelection()
    if (start !== end) return

    if (getOpenFormatStack(text, start).length === 0) return

    event.preventDefault()
    applyEditorUpdate(closeFormatsAndInsertNewline(text, start))
  }

  function handleDisplayFormattingMarkersChange(nextValue) {
    const storageSelection = getTextareaStorageSelection()

    setDisplayFormattingMarkers(nextValue)
    storageSelectionRef.current = storageSelection

    const nextSelection = nextValue
      ? storageSelection
      : mapStorageSelectionToDisplay(
          text,
          storageSelection.start,
          storageSelection.end,
        )

    queueDisplaySelection(nextSelection.start, nextSelection.end)
  }

  const editorStyle = getEditorTypography(fontSize, fontFamily)
  const displayText = getDisplayText(text, displayFormattingMarkers)

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
        <div
          ref={highlightRef}
          className="editor-highlight"
          style={editorStyle}
          aria-hidden="true"
        >
          {renderTaggedContent(text, customTags, displayFormattingMarkers)}
        </div>

        <textarea
          ref={textareaRef}
          className="editor"
          style={editorStyle}
          value={displayText}
          onChange={handleTextChange}
          onKeyDown={handleEditorKeyDown}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
          onScroll={syncScroll}
          placeholder="Start writing..."
          spellCheck
        />
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
        onDisplayFormattingMarkersChange={handleDisplayFormattingMarkersChange}
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
