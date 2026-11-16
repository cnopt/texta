import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@capawesome/capacitor-dialog'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CreateNotebook from './CreateNotebook.jsx'
import NewPageTypeModal from './NewPageTypeModal.jsx'
import NotebookIcon from './NotebookIcon.jsx'
import PageTab from './PageTab.jsx'
import {
  createPage,
  deleteNotebook,
  getCachedNotebookById,
  getNotebookById,
  reorderPages,
} from './notebooks.js'
import { setNotebookHomeBackHandler } from './notebookHomeBack.js'
import './CircleButton.css'
import './ScreenToolbar.css'
import './NotebookHomeView.css'

function DragHandleIcon() {
  return (
    <svg className="notebook-home-page-drag-icon" viewBox="0 0 10 16" aria-hidden="true">
      <circle cx="2" cy="2" r="1.35" />
      <circle cx="8" cy="2" r="1.35" />
      <circle cx="2" cy="8" r="1.35" />
      <circle cx="8" cy="8" r="1.35" />
      <circle cx="2" cy="14" r="1.35" />
      <circle cx="8" cy="14" r="1.35" />
    </svg>
  )
}

function getInsertBeforeIndex(listElement, clientY) {
  const items = [...listElement.querySelectorAll('[data-page-index]')]

  for (let index = 0; index < items.length; index += 1) {
    const rect = items[index].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return index
  }

  return items.length
}

function getReorderIndex(insertBeforeIndex, dragIndex) {
  if (insertBeforeIndex > dragIndex) return insertBeforeIndex - 1
  return insertBeforeIndex
}

function movePage(pages, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex >= pages.length
  ) {
    return pages
  }

  const next = [...pages]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

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
  const [reordering, setReordering] = useState(false)
  const [draftPages, setDraftPages] = useState([])
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [insertBeforeIndex, setInsertBeforeIndex] = useState(null)
  const menuRef = useRef(null)
  const pageListRef = useRef(null)
  const dragIndexRef = useRef(null)
  const draftPagesRef = useRef([])
  const ignorePageClickRef = useRef(false)
  const shouldAnimateBackground = Boolean(location.state?.transitionBackground)
  const [enterPhase, setEnterPhase] = useState(
    shouldAnimateBackground ? 'entering' : 'idle',
  )
  const [contentAnimating, setContentAnimating] = useState(false)

  useEffect(() => {
    let cancelled = false
    const seeded = seedNotebook(id, location.state)

    setReordering(false)
    setDraftPages([])
    draftPagesRef.current = []
    dragIndexRef.current = null
    setDraggingIndex(null)
    setInsertBeforeIndex(null)

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
    if (!reordering) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') handleCancelReorder()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [reordering])

  useEffect(() => {
    if (!reordering) {
      setNotebookHomeBackHandler(null)
      return undefined
    }

    setNotebookHomeBackHandler(() => handleCancelReorder())

    return () => {
      setNotebookHomeBackHandler(null)
    }
  }, [reordering])

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

  async function handleDeleteClick() {
    setMenuOpen(false)
    const { value } = await Dialog.confirm({
      title: 'Delete notebook?',
      message: `“${notebook.name}” and all of its pages will be permanently deleted.`,
      okButtonTitle: 'Delete',
      cancelButtonTitle: 'Cancel',
    })
    if (!value) return

    await deleteNotebook(notebook.id)
    navigate('/')
  }

  function handleStartReorder() {
    if (reordering || notebook.pages.length === 0) return
    ignorePageClickRef.current = true
    setMenuOpen(false)
    setDraftPages(notebook.pages)
    draftPagesRef.current = notebook.pages
    setReordering(true)
  }

  function handleCancelReorder() {
    dragIndexRef.current = null
    setDraggingIndex(null)
    setInsertBeforeIndex(null)
    setDraftPages([])
    draftPagesRef.current = []
    setReordering(false)
    ignorePageClickRef.current = false
  }

  async function handleSaveReorder() {
    const next = await reorderPages(
      notebook.id,
      draftPagesRef.current.map((page) => page.id),
    )
    if (next) setNotebook(next)
    handleCancelReorder()
  }

  function handlePageClick(page) {
    if (reordering || ignorePageClickRef.current) {
      ignorePageClickRef.current = false
      return
    }

    navigate(`/notebook/${notebook.id}/page/${page.id}`)
  }

  function finishDrag() {
    dragIndexRef.current = null
    setDraggingIndex(null)
    setInsertBeforeIndex(null)
  }

  function handleDragHandlePointerDown(event, index) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragIndexRef.current = index
    setDraggingIndex(index)
    setInsertBeforeIndex(index)
  }

  function handleDragHandlePointerMove(event) {
    const currentDragIndex = dragIndexRef.current
    if (currentDragIndex === null || !pageListRef.current) return

    event.preventDefault()

    const nextInsertBeforeIndex = getInsertBeforeIndex(pageListRef.current, event.clientY)
    setInsertBeforeIndex(nextInsertBeforeIndex)

    const nextDropIndex = getReorderIndex(nextInsertBeforeIndex, currentDragIndex)
    if (nextDropIndex !== currentDragIndex) {
      const nextPages = movePage(draftPagesRef.current, currentDragIndex, nextDropIndex)
      draftPagesRef.current = nextPages
      setDraftPages(nextPages)
      dragIndexRef.current = nextDropIndex
      setDraggingIndex(nextDropIndex)
    }
  }

  function handleDragHandlePointerUp(event) {
    if (dragIndexRef.current === null) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    finishDrag()
  }

  function handleDragHandlePointerCancel(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    finishDrag()
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
            onClick={() => {
              if (reordering) {
                handleCancelReorder()
                return
              }
              navigate('/')
            }}
            aria-label={reordering ? 'Cancel reorder' : 'Go back'}
          >
            ←
          </button>

          {!reordering && (
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
                    onClick={() => void handleDeleteClick()}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
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
          <div className="notebook-home-pages-header">
            <h2 className="notebook-home-pages-heading">Pages</h2>
            {reordering && (
              <div className="notebook-home-pages-actions">
                <button
                  type="button"
                  className="notebook-home-pages-action"
                  onClick={handleCancelReorder}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="notebook-home-pages-action notebook-home-pages-action--save"
                  onClick={() => void handleSaveReorder()}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div
            ref={pageListRef}
            className={[
              'notebook-home-page-list',
              reordering && 'notebook-home-page-list--reordering',
              draggingIndex !== null && 'notebook-home-page-list--dragging',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {(reordering ? draftPages : notebook.pages).map((page, index) => {
              const targetIndex =
                draggingIndex !== null
                  ? getReorderIndex(insertBeforeIndex ?? draggingIndex, draggingIndex)
                  : null
              const showDropBefore =
                targetIndex !== draggingIndex &&
                insertBeforeIndex === index &&
                insertBeforeIndex < draftPages.length
              const showDropAfter =
                targetIndex !== draggingIndex &&
                insertBeforeIndex === draftPages.length &&
                index === draftPages.length - 1

              return (
                <div
                  key={page.id}
                  data-page-index={index}
                  className={[
                    'notebook-home-page-row',
                    reordering && 'notebook-home-page-row--reordering',
                    draggingIndex === index && 'notebook-home-page-row--dragging',
                    showDropBefore && 'notebook-home-page-row--drop-before',
                    showDropAfter && 'notebook-home-page-row--drop-after',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="notebook-home-page-drag-handle"
                    tabIndex={reordering ? 0 : -1}
                    disabled={!reordering}
                    aria-hidden={!reordering}
                    aria-label={`Reorder ${page.title}`}
                    onPointerDown={(event) => handleDragHandlePointerDown(event, index)}
                    onPointerMove={handleDragHandlePointerMove}
                    onPointerUp={handleDragHandlePointerUp}
                    onPointerCancel={handleDragHandlePointerCancel}
                  >
                    <DragHandleIcon />
                  </button>

                  <PageTab
                    title={page.title}
                    onClick={reordering ? undefined : () => handlePageClick(page)}
                    onLongPress={reordering ? undefined : handleStartReorder}
                  />
                </div>
              )
            })}

            {!reordering && (
              <PageTab
                title="+ Create New Page"
                variant="create"
                onClick={() => setPageTypeModalOpen(true)}
              />
            )}
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
    </div>
  )
}
