import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import NewPageTypeModal from './NewPageTypeModal.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import { createPage, getNotebookById } from './notebooks.js'
import './NotebookHomeView.css'

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
  const [notebook, setNotebook] = useState(() => getNotebookById(id))
  const [pageTypeModalOpen, setPageTypeModalOpen] = useState(false)
  const shouldAnimateBackground = Boolean(location.state?.transitionBackground)
  const [enterPhase, setEnterPhase] = useState(
    shouldAnimateBackground ? 'entering' : 'idle',
  )
  const [contentAnimating, setContentAnimating] = useState(false)

  useEffect(() => {
    setNotebook(getNotebookById(id))
  }, [id])

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

    const staggerItemCount = 3 + notebook.pages.length + 1
    const animationDuration = (staggerItemCount - 1) * 55 + 450 + 50

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
    return (
      <div className="notebook-home notebook-home--missing">
        <header className="notebook-home-toolbar">
          <button
            type="button"
            className="notebook-home-circle-button"
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

  function handleCreatePage({ type, title }) {
    if (type === 'page') {
      createPage(notebook.id, { title })
      setNotebook(getNotebookById(notebook.id))
    }
  }

  const homeClassName = [
    'notebook-home',
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
        <header className="notebook-home-toolbar">
        <button
          type="button"
          className="notebook-home-circle-button notebook-home-fade-item"
          style={{ '--stagger-index': 0 }}
          onClick={() => navigate('/')}
          aria-label="Go back"
        >
          ←
        </button>

        <button
          type="button"
          className="notebook-home-circle-button notebook-home-fade-item"
          style={{ '--stagger-index': 0 }}
          aria-label="More options"
        >
          ⋯
        </button>
      </header>

      <section
        className="notebook-home-hero notebook-home-stagger-item"
        style={{ '--stagger-index': 1 }}
      >
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

      <section className="notebook-home-pages">
        <h2
          className="notebook-home-pages-heading notebook-home-stagger-item"
          style={{ '--stagger-index': 2 }}
        >
          Pages
        </h2>

        <div className="notebook-home-page-list">
          {notebook.pages.map((page, pageIndex) => (
            <button
              key={page.id}
              type="button"
              className="notebook-home-page-button notebook-home-page-button--existing notebook-home-stagger-item"
              style={{ '--stagger-index': 3 + pageIndex }}
              onClick={() => navigate(`/notebook/${notebook.id}/page/${page.id}`)}
            >
              {page.title}
            </button>
          ))}

          <button
            type="button"
            className="notebook-home-page-button notebook-home-page-button--create notebook-home-stagger-item"
            style={{ '--stagger-index': 3 + notebook.pages.length }}
            onClick={() => setPageTypeModalOpen(true)}
          >
            + Create New Page
          </button>
        </div>
      </section>
      </div>

      <NewPageTypeModal
        isOpen={pageTypeModalOpen}
        onClose={() => setPageTypeModalOpen(false)}
        onCreate={handleCreatePage}
      />
    </div>
  )
}
