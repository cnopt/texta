import './QuickBar.css'

export default function QuickBarSearchBar({ searchQuery, onSearchQueryChange }) {
  return (
    <div className="quick-bar-search">
      <span className="quick-bar-search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        className="quick-bar-search-input"
        placeholder="Search"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />
    </div>
  )
}
