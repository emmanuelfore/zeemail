
interface EmptyStateProps {
  heading: string;
  subtext: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ heading, subtext, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '1rem',
        textAlign: 'center',
      }}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="30" stroke="var(--border)" strokeWidth="2" />
        <path
          d="M20 32h24M32 20v24"
          stroke="#660B05"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="8" stroke="var(--primary)" strokeWidth="2" />
      </svg>
      <h3 style={{ color: 'var(--on-background)', fontSize: '1.125rem', fontWeight: 600 }}>{heading}</h3>
      <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', maxWidth: '320px' }}>{subtext}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
