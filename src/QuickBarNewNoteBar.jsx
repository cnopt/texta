import { useNavigate } from 'react-router-dom'
import './QuickBar.css'

function BlankPaperIcon() {
  return (
    <svg
      className="quick-bar-new-note-paper"
      viewBox="0 0 24 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1.5h8L22.5 10.5V30.5H5V1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M13 1.5V10.5H22.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function QuickBarNewNoteBar() {
  const navigate = useNavigate()

  function handleOpen() {
    navigate('/note/new')
  }

  return (
    <button type="button" className="quick-bar-new-note" onClick={handleOpen}>
      <div className="quick-bar-new-note-icon">
        <BlankPaperIcon />
      </div>
      <span className="quick-bar-new-note-input">New note</span>
    </button>
  )
}
