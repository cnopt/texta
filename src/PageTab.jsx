import './PageTab.css'

function PageIcon() {
  return (
    <svg
      className="page-tab-icon"
      viewBox="0 0 16 20"
      width="16"
      height="20"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M3 2.5h7.2L13.5 5.8V17.5H3V2.5z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 2.5v3.3h3.3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 8.5h5.6M5.2 11h5.6M5.2 13.5h4.2"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

export default function PageTab({
  title,
  variant = 'page',
  className = '',
  style,
  onClick,
}) {
  const isCreate = variant === 'create'

  return (
    <button
      type="button"
      className={[
        'page-tab',
        isCreate && 'page-tab--create',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={onClick}
    >
      <span className="page-tab-title">
        {!isCreate && <PageIcon />}
        <span className="page-tab-title-text">{title}</span>
      </span>
    </button>
  )
}
