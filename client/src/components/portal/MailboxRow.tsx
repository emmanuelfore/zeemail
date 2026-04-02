import { useState } from 'react';
import { StatusBadge } from '../shared/StatusBadge';
import type { Mailbox } from '../../types/index';

interface MailboxRowProps {
  mailbox: Mailbox;
  onResetPassword: (email: string, newPassword: string) => Promise<void>;
}

export function MailboxRow({ mailbox, onResetPassword }: MailboxRowProps) {
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [pwError, setPwError] = useState('');

  async function handleReset() {
    if (!newPassword.trim()) {
      setPwError('Password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setResetting(true);
    setPwError('');
    try {
      await onResetPassword(mailbox.email, newPassword);
      setShowModal(false);
      setNewPassword('');
    } finally {
      setResetting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setNewPassword('');
    setPwError('');
  }

  return (
    <>
      <tr
        data-testid="mailbox-row"
        style={{ borderBottom: '1px solid var(--border)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLTableRowElement).style.background = 'var(--cream-2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
        }}
      >
        {/* Email */}
        <td style={{ padding: '0.75rem 1rem' }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--ink)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {mailbox.email}
          </span>
        </td>

        {/* Storage */}
        <td style={{ padding: '0.75rem 1rem', minWidth: '140px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                height: '8px',
                borderRadius: '4px',
                background: 'var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, ((mailbox.quota_used_mb ?? 0) / mailbox.quota_mb) * 100)}%`,
                  background: (mailbox.quota_used_mb ?? 0) > mailbox.quota_mb * 0.9 ? 'var(--danger)' : 'var(--primary)',
                  borderRadius: '4px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              {(mailbox.quota_used_mb ?? 0).toFixed(1)} MB / {mailbox.quota_mb >= 1024
                ? `${(mailbox.quota_mb / 1024).toFixed(1)} GB`
                : `${mailbox.quota_mb} MB`}
            </span>
          </div>
        </td>

        {/* Status */}
        <td style={{ padding: '0.75rem 1rem' }}>
          <StatusBadge status={mailbox.status} />
        </td>

        {/* Actions */}
        <td style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'white',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = 'var(--primary)';
              }}
            >
              Reset password
            </button>
          </div>
        </td>
      </tr>

      {/* Reset password modal */}
      {showModal && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(26, 3, 1, 0.4)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={closeModal}
            >
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '2.5rem',
                  width: '100%',
                  maxWidth: '440px',
                  display: 'flex',
                  boxShadow: 'var(--shadow-xl)',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 style={{ color: 'var(--ink)', margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                    Security Reset
                  </h3>
                  <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                    Enter a new access password for{' '}
                    <strong style={{ color: 'var(--ink)' }}>{mailbox.email}</strong>.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                    style={{
                      background: 'var(--bg-page)',
                      border: `2px solid ${pwError ? 'var(--danger)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      color: 'var(--ink)',
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    autoFocus
                  />
                  {pwError && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>{pwError}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    onClick={closeModal}
                    style={{
                      background: 'transparent',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    style={{
                      background: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: resetting ? 'not-allowed' : 'pointer',
                      opacity: resetting ? 0.7 : 1,
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {resetting ? 'Applying…' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
