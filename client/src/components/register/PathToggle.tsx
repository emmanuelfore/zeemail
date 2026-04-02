interface PathToggleProps {
  path: 'A' | 'B';
  onPathChange: (path: 'A' | 'B') => void;
  onReset: () => void;
}

export default function PathToggle({ path, onPathChange, onReset }: PathToggleProps) {
  function handleClick(newPath: 'A' | 'B') {
    if (newPath === path) return;
    onPathChange(newPath);
    onReset();
  }

  return (
    <div
      data-testid="path-toggle"
      role="group"
      aria-label="Registration path"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        data-testid="path-toggle-a"
        aria-pressed={path === 'A'}
        onClick={() => handleClick('A')}
        style={{
          padding: '0.625rem 1.75rem',
          background: path === 'A' ? 'var(--primary)' : 'transparent',
          color: path === 'A' ? '#ffffff' : 'var(--muted)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.9375rem',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)',
        }}
      >
        New Domain
      </button>
      <button
        type="button"
        data-testid="path-toggle-b"
        aria-pressed={path === 'B'}
        onClick={() => handleClick('B')}
        style={{
          padding: '0.625rem 1.75rem',
          background: path === 'B' ? 'var(--primary)' : 'transparent',
          color: path === 'B' ? '#ffffff' : 'var(--muted)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.9375rem',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)',
        }}
      >
        Existing Domain
      </button>
    </div>
  );
}
