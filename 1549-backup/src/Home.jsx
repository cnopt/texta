import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateNotebook from './CreateNotebook.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import { getNotebooks } from './notebooks.js'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const [notebooks, setNotebooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setNotebooks(getNotebooks())
  }, [])

  const filteredNotebooks = notebooks.filter((notebook) =>
    notebook.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  function handleCreateNotebook() {
    setCreateOpen(true)
  }

  function handleNotebookCreated() {
    setNotebooks(getNotebooks())
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">My Notebooks</h1>

        <div className="home-search">
          <span className="home-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="home-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {notebooks.length === 0 ? (
        <div className="home-empty">
          <button type="button" className="home-create-button" onClick={handleCreateNotebook}>
            Create new Notebook
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="home-add-button" onClick={handleCreateNotebook}>
            Create New Notebook
          </button>

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
        </>
      )}

      <CreateNotebook
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleNotebookCreated}
      />
    </div>
  )
}
