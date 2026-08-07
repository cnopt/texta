import './NoteCard.css'
import { getDisplayText } from './inlineFormat.js'

export default function NoteCard({ note, onClick, displayMode = 'fixed', dynamicMetrics }) {
  const preview = getDisplayText(note.content).trim() || 'Empty note'
  const isDynamic = displayMode === 'dynamic'

  return (
    <button
      type="button"
      className={[
        'note-card',
        isDynamic && 'note-card--dynamic',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        dynamicMetrics
          ? { '--note-card-lines': dynamicMetrics.displayLines }
          : undefined
      }
      onClick={onClick}
    >
      <span className="note-card-content">{preview}</span>
    </button>
  )
}
