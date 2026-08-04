import './NotebookIcon.css'

export default function NotebookIcon({ color, letter = '', size = 'large' }) {
  return (
    <div
      className={`notebook-icon notebook-icon--${size}`}
      style={{ '--icon-color': color }}
      aria-hidden="true"
    >
      <div className="notebook-icon-shadow" />
      <div className="notebook-icon-face">
        <div className="notebook-icon-spine">
          <span className="notebook-icon-ring" />
          <span className="notebook-icon-ring" />
          <span className="notebook-icon-ring" />
        </div>
        <div className="notebook-icon-pages" />
        <div className="notebook-icon-cover-lines" />
        <span className="notebook-icon-letter">{letter}</span>
      </div>
    </div>
  )
}
