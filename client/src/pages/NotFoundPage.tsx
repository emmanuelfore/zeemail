import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        color: 'var(--text-cream, var(--on-background))',
        background: 'var(--bg-page, var(--surface))',
      }}
    >
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0 }}>
        Page not found.
      </p>
      <Link
        to="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.25rem',
          background: 'var(--primary, var(--primary))',
          color: 'var(--text-cream, var(--on-background))',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
