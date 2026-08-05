import './NoteCard.css'

export default function NoteCard({ note, onClick }) {
  const preview = note.content.trim() || 'Empty note'

  return (
    <button type="button" className="note-card" onClick={onClick}>
      <span className="note-card-content">{preview}</span>
    </button>
  )
}
