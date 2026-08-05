import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CreateNotebook from './CreateNotebook.jsx'
import NoteCard from './NoteCard.jsx'
import QuickBarNewNoteBar from './QuickBarNewNoteBar.jsx'
import QuickBarSearchBar from './QuickBarSearchBar.jsx'
import HomeSettings from './HomeSettings.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import { getHomeSettings, saveHomeSettings } from './homeSettings.js'
import { getNotebooks } from './notebooks.js'
import { getNotes } from './notes.js'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [notebooks, setNotebooks] = useState(() => getNotebooks())
  const [notes, setNotes] = useState(() => getNotes())
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickBar, setQuickBar] = useState(() => getHomeSettings().quickBar)
  const [sections, setSections] = useState(() => getHomeSettings().sections)

  useEffect(() => {
    setNotebooks(getNotebooks())
    setNotes(getNotes())
  }, [location.key])

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

  function handleNotebookCreated() {
    setNotebooks(getNotebooks())
  }

  function handleQuickBarChange(nextQuickBar) {
    setQuickBar(nextQuickBar)
    saveHomeSettings({ quickBar: nextQuickBar })
  }

  function handleSectionChange(sectionId, visible) {
    const nextSections = { ...sections, [sectionId]: visible }
    setSections(nextSections)
    saveHomeSettings({ sections: { [sectionId]: visible } })
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
                      state: { transitionBackground: true },
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
            <ul className="home-notes-grid">
              {sortedNotes.map((note) => (
                <li key={note.id}>
                  <NoteCard
                    note={note}
                    onClick={() => navigate(`/note/${note.id}`)}
                  />
                </li>
              ))}
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
      />
    </div>
  )
}
