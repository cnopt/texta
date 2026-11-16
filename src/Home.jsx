import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateNotebook from './CreateNotebook.jsx'
import NoteCard from './NoteCard.jsx'
import QuickBarNewNoteBar from './QuickBarNewNoteBar.jsx'
import QuickBarSearchBar from './QuickBarSearchBar.jsx'
import HomeSettings from './HomeSettings.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import { DEFAULT_SETTINGS, getHomeSettings, saveHomeSettings } from './homeSettings.js'
import { createDefaultFloatingBarTools, DEFAULT_FLOATING_BAR_COLOR } from './floatingBarSettings.js'
import { applyTheme } from './theme.js'
import { getNotebooks } from './notebooks.js'
import { getNotes } from './notes.js'
import { getNoteCardMetrics } from './noteCardGrid.js'
import { getDisplayText } from './inlineFormat.js'
import './Home.css'

export default function Home({ active = true }) {
  const navigate = useNavigate()
  const [notebooks, setNotebooks] = useState([])
  const [notes, setNotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickBar, setQuickBar] = useState(DEFAULT_SETTINGS.quickBar)
  const [sections, setSections] = useState(DEFAULT_SETTINGS.sections)
  const [noteCardDisplayMode, setNoteCardDisplayMode] = useState(
    DEFAULT_SETTINGS.noteCardDisplayMode,
  )
  const [theme, setTheme] = useState(DEFAULT_SETTINGS.theme)
  const [floatingBarColor, setFloatingBarColor] = useState(DEFAULT_FLOATING_BAR_COLOR)
  const [floatingBarTools, setFloatingBarTools] = useState(createDefaultFloatingBarTools())

  async function loadHomeData() {
    const [nextNotebooks, nextNotes, homeSettings] = await Promise.all([
      getNotebooks(),
      getNotes(),
      getHomeSettings(),
    ])

    setNotebooks(nextNotebooks)
    setNotes(nextNotes)
    setQuickBar(homeSettings.quickBar)
    setSections(homeSettings.sections)
    setNoteCardDisplayMode(homeSettings.noteCardDisplayMode)
    setTheme(homeSettings.theme)
    applyTheme(homeSettings.theme)
    setFloatingBarColor(homeSettings.floatingBarColor)
    setFloatingBarTools(homeSettings.floatingBarTools)
  }

  useEffect(() => {
    if (!active) return

    let cancelled = false

    async function load() {
      const [nextNotebooks, nextNotes, homeSettings] = await Promise.all([
        getNotebooks(),
        getNotes(),
        getHomeSettings(),
      ])

      if (cancelled) return

      setNotebooks(nextNotebooks)
      setNotes(nextNotes)
      setQuickBar(homeSettings.quickBar)
      setSections(homeSettings.sections)
      setNoteCardDisplayMode(homeSettings.noteCardDisplayMode)
      setTheme(homeSettings.theme)
      applyTheme(homeSettings.theme)
      setFloatingBarColor(homeSettings.floatingBarColor)
      setFloatingBarTools(homeSettings.floatingBarTools)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [active])

  const filteredNotebooks =
    quickBar === 'search'
      ? notebooks.filter((notebook) =>
          notebook.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
      : notebooks

  const sortedNotes = [...notes].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )

  function handleCreateNotebook() {
    setCreateOpen(true)
  }

  async function handleNotebookCreated() {
    setNotebooks(await getNotebooks())
  }

  function handleQuickBarChange(nextQuickBar) {
    setQuickBar(nextQuickBar)
    void saveHomeSettings({ quickBar: nextQuickBar })
  }

  function handleSectionChange(sectionId, visible) {
    const nextSections = { ...sections, [sectionId]: visible }
    setSections(nextSections)
    void saveHomeSettings({ sections: { [sectionId]: visible } })
  }

  function handleNoteCardDisplayModeChange(nextMode) {
    setNoteCardDisplayMode(nextMode)
    void saveHomeSettings({ noteCardDisplayMode: nextMode })
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme)
    applyTheme(nextTheme)
    void saveHomeSettings({ theme: nextTheme })
  }

  function handleFloatingBarColorChange(nextColor) {
    setFloatingBarColor(nextColor)
    void saveHomeSettings({ floatingBarColor: nextColor })
  }

  function handleFloatingBarToolsChange(nextTools) {
    setFloatingBarTools(nextTools)
    void saveHomeSettings({ floatingBarTools: nextTools })
  }

  function handleCreateNote() {
    navigate('/note/new')
  }

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-header-top">
          <h1 className="home-title">texta</h1>

          <button
            type="button"
            className="home-settings-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open home settings"
          >
            ⛭
          </button>
        </div>

        {quickBar === 'search' ? (
          <QuickBarSearchBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
        ) : (
          <QuickBarNewNoteBar />
        )}
      </header>

      {sections.notebooks && (
        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-heading">Notebooks</h2>
            <button type="button" className="home-section-create" onClick={handleCreateNotebook}>
              Add
            </button>
          </div>

          {filteredNotebooks.length > 0 && (
            <ul className="home-notebook-list">
              {filteredNotebooks.map((notebook) => (
                <li
                  key={notebook.id}
                  className="home-notebook-item"
                  style={{ '--notebook-color': notebook.icon }}
                  onClick={() =>
                    navigate(`/notebook/${notebook.id}`, {
                      state: { transitionBackground: true, notebook },
                    })
                  }
                >
                  <NotebookIcon
                    color={notebook.icon}
                    letter={notebook.name.trim().charAt(0).toUpperCase()}
                    size="small"
                  />
                  <button
                    type="button"
                    className="home-notebook-name"
                  >
                    {notebook.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {sections.notes && (
        <section className="home-section home-notes-section">
          <div className="home-section-header">
            <h2 className="home-section-heading">Notes</h2>
            <button type="button" className="home-section-create" onClick={handleCreateNote}>
              Add
            </button>
          </div>

          {sortedNotes.length > 0 && (
            <ul
              className={`home-notes-grid${
                noteCardDisplayMode === 'dynamic' ? ' home-notes-grid--dynamic' : ''
              }`}
            >
              {sortedNotes.map((note) => {
                const preview = getDisplayText(note.content).trim() || 'Empty note'
                const metrics =
                  noteCardDisplayMode === 'dynamic' ? getNoteCardMetrics(preview) : null

                return (
                  <li
                    key={note.id}
                    style={
                      metrics ? { gridRowEnd: `span ${metrics.rowSpan}` } : undefined
                    }
                  >
                    <NoteCard
                      note={note}
                      displayMode={noteCardDisplayMode}
                      dynamicMetrics={metrics}
                      onClick={() => navigate(`/note/${note.id}`)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <CreateNotebook
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleNotebookCreated}
      />

      <HomeSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        quickBar={quickBar}
        onQuickBarChange={handleQuickBarChange}
        sections={sections}
        onSectionChange={handleSectionChange}
        noteCardDisplayMode={noteCardDisplayMode}
        onNoteCardDisplayModeChange={handleNoteCardDisplayModeChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        floatingBarColor={floatingBarColor}
        onFloatingBarColorChange={handleFloatingBarColorChange}
        floatingBarTools={floatingBarTools}
        onFloatingBarToolsChange={handleFloatingBarToolsChange}
        onDataImported={loadHomeData}
      />
    </div>
  )
}
