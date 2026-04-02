
interface MailcowBannerProps {
  show: boolean;
}

export function MailcowBanner({ show }: MailcowBannerProps) {
  if (!show) return null;

  return (
    <div
      role="alert"
      style={{
        width: '100%',
        backgroundColor: 'var(--border)',
        borderBottom: '1px solid var(--primary)',
        color: 'var(--on-background)',
        padding: '0.625rem 1.5rem',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3.5M8 10.5v.5"
          stroke="#F87171"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        <strong>Mailcow server unreachable.</strong> Email management features are temporarily unavailable.
      </span>
    </div>
  );
}
