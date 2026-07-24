export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="page-header-title">{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="page-header-actions">{actions}</div>
      )}
    </header>
  )
}
