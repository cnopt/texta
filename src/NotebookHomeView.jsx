import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CreateNotebook from './CreateNotebook.jsx'
import NewPageTypeModal from './NewPageTypeModal.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import PageTab from './PageTab.jsx'
import { createPage, deleteNotebook, getCachedNotebookById, getNotebookById } from './notebooks.js'
import './CircleButton.css'
import './ScreenToolbar.css'
import './NotebookHomeView.css'

function seedNotebook(id, locationState) {
  const fromState = locationState?.notebook
  if (fromState?.id === id) return fromState
  return getCachedNotebookById(id)
}

function formatCreatedDate(iso) {
  if (!iso) return ''

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function NotebookHomeView() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [notebook, setNotebook] = useState(() => seedNotebook(id, location.state))
  const [ready, setReady] = useState(() => Boolean(seedNotebook(id, location.state)))
  const [pageTypeModalOpen, setPageTypeModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const menuRef = useRef(null)
  const shouldAnimateBackground = Boolean(location.state?.transitionBackground)
  const [enterPhase, setEnterPhase] = useState(
    shouldAnimateBackground ? 'entering' : 'idle',
  )
  const [contentAnimating, setContentAnimating] = useState(false)

  useEffect(() => {
    let cancelled = false
    const seeded = seedNotebook(id, location.state)

    if (seeded) {
      setNotebook(seeded)
      setReady(true)
    } else {
      setNotebook((current) => (current?.id === id ? current : null))
      setReady(false)
    }

    async function loadNotebook() {
      const next = await getNotebookById(id)
      if (cancelled) return
      setNotebook(next)
      setReady(true)
    }

    void loadNotebook()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (enterPhase !== 'entering') return undefined

    let openFrame
    const startFrame = requestAnimationFrame(() => {
      openFrame = requestAnimationFrame(() => setEnterPhase('background'))
    })

    return () => {
      cancelAnimationFrame(startFrame)
      if (openFrame) cancelAnimationFrame(openFrame)
    }
  }, [enterPhase])

  useEffect(() => {
    if (enterPhase !== 'background') return undefined

    const contentTimer = setTimeout(() => {
      setEnterPhase('content')
    }, 60)

    return () => clearTimeout(contentTimer)
  }, [enterPhase])

  useEffect(() => {
    if (enterPhase !== 'content') return undefined

    let openFrame
    const startFrame = requestAnimationFrame(() => {
      openFrame = requestAnimationFrame(() => setContentAnimating(true))
    })

    return () => {
      cancelAnimationFrame(startFrame)
      if (openFrame) cancelAnimationFrame(openFrame)
    }
  }, [enterPhase])

  useEffect(() => {
    if (enterPhase !== 'content' || !contentAnimating || !notebook) return undefined

    const animationDuration = 1600

    const clearStateTimer = setTimeout(() => {
      setEnterPhase('idle')
      setContentAnimating(false)
      if (location.state?.transitionBackground) {
        navigate(location.pathname, { replace: true, state: null })
      }
    }, animationDuration)

    return () => clearTimeout(clearStateTimer)
  }, [enterPhase, contentAnimating, notebook, location.pathname, location.state, navigate])

  if (!notebook) {
    if (!ready) {
      return <div className="notebook-home screen-page" />
    }

    return (
      <div className="notebook-home notebook-home--missing screen-page">
        <header className="screen-toolbar notebook-home-toolbar">
          <button
            type="button"
            className="circle-button"
            onClick={() => navigate('/')}
            aria-label="Go back"
          >
            ←
          </button>
        </header>
        <p className="notebook-home-missing-text">Notebook not found.</p>
      </div>
    )
  }

  async function handleCreatePage({ type, title }) {
    if (type === 'page') {
      await createPage(notebook.id, { title })
      setNotebook(await getNotebookById(notebook.id))
    }
  }

  function handleRename() {
    setMenuOpen(false)
    setRenameOpen(true)
  }

  async function handleRenameSaved() {
    setNotebook(await getNotebookById(notebook.id))
  }

  function handleDeleteClick() {
    setMenuOpen(false)
    setDeleteConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    await deleteNotebook(notebook.id)
    navigate('/')
  }

  const homeClassName = [
    'notebook-home',
    'screen-page',
    enterPhase === 'entering' && 'notebook-home--entering',
    enterPhase === 'background' && 'notebook-home--background',
    enterPhase === 'content' && 'notebook-home--content',
    enterPhase === 'content' && contentAnimating && 'notebook-home--content-animate',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={homeClassName}
      style={{ '--notebook-color': notebook.icon }}
    >
      <div className="notebook-home-bg" aria-hidden="true" />
      <div className="notebook-home-gradient" aria-hidden="true" />

      <div className="notebook-home-content">
        <header className="screen-toolbar notebook-home-toolbar">
          <button
            type="button"
            className="circle-button"
            onClick={() => navigate('/')}
            aria-label="Go back"
          >
            ←
          </button>

          <div className="notebook-home-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="circle-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              ⋯
            </button>

            {menuOpen && (
              <div className="notebook-home-flyout" role="menu">
                <button
                  type="button"
                  className="notebook-home-flyout-item"
                  role="menuitem"
                  onClick={handleRename}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="notebook-home-flyout-item notebook-home-flyout-item--danger"
                  role="menuitem"
                  onClick={handleDeleteClick}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="notebook-home-hero">
          <NotebookIcon
            color={notebook.icon}
            letter={notebook.name.trim().charAt(0).toUpperCase()}
          />
          <div className="notebook-home-hero-info">
            <h1 className="notebook-home-name">{notebook.name}</h1>
            {notebook.createdAt && (
              <p className="notebook-home-date">
                Created {formatCreatedDate(notebook.createdAt)}
              </p>
            )}
          </div>
        </section>

        <div className="notebook-home-hero-divider" aria-hidden="true" />

        <section className="notebook-home-pages">
          <h2 className="notebook-home-pages-heading">Pages</h2>

          <div className="notebook-home-page-list">
            {notebook.pages.map((page) => (
              <PageTab
                key={page.id}
                title={page.title}
                onClick={() => navigate(`/notebook/${notebook.id}/page/${page.id}`)}
              />
            ))}

            <PageTab
              title="+ Create New Page"
              variant="create"
              onClick={() => setPageTypeModalOpen(true)}
            />
          </div>
        </section>
      </div>

      <NewPageTypeModal
        isOpen={pageTypeModalOpen}
        onClose={() => setPageTypeModalOpen(false)}
        onCreate={(payload) => void handleCreatePage(payload)}
      />

      <CreateNotebook
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        onCreated={handleRenameSaved}
        notebook={notebook}
      />

      {deleteConfirmOpen && (
        <>
          <div
            className="notebook-home-confirm-backdrop"
            onClick={() => setDeleteConfirmOpen(false)}
            aria-hidden="true"
          />
          <div
            className="notebook-home-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notebook-delete-title"
            aria-describedby="notebook-delete-desc"
          >
            <h2 id="notebook-delete-title" className="notebook-home-confirm-title">
              Delete notebook?
            </h2>
            <p id="notebook-delete-desc" className="notebook-home-confirm-text">
              “{notebook.name}” and all of its pages will be permanently deleted.
            </p>
            <div className="notebook-home-confirm-actions">
              <button
                type="button"
                className="notebook-home-confirm-button"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notebook-home-confirm-button notebook-home-confirm-button--danger"
                onClick={() => void handleConfirmDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
