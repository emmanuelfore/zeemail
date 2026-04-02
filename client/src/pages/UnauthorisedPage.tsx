import { useAuth } from '../hooks/useAuth';

export function UnauthorisedPage() {
  const { signOut } = useAuth();

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
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0 }}>403</h1>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0 }}>
        You don&apos;t have permission to access this page.
      </p>
      <button
        onClick={signOut}
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.25rem',
          background: 'var(--primary, var(--primary))',
          color: 'var(--text-cream, var(--on-background))',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '1rem',
        }}
      >
        Log out
      </button>
    </div>
  );
}
