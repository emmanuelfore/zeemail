import { useState } from 'react';
import { StatusBadge } from '../shared/StatusBadge';
import type { Mailbox } from '../../types/index';

interface MailboxRowProps {
  mailbox: Mailbox;
  plan: string;
  onResetPassword: (email: string, newPassword: string) => Promise<void>;
  onUpdateQuota: (email: string, newQuota: number) => Promise<void>;
  onDelete: (email: string) => Promise<void>;
}

export function MailboxRow({ mailbox, plan, onResetPassword, onUpdateQuota, onDelete }: MailboxRowProps) {
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [pwError, setPwError] = useState('');

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [newQuota, setNewQuota] = useState(mailbox.quota_mb.toString());
  const [updatingQuota, setUpdatingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const planMax = {
    'starter': 2048,
    'business': 5120,
    'pro': 10240
  }[plan?.toLowerCase()] || 2048;

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
      setShowPwModal(false);
      setNewPassword('');
    } finally {
      setResetting(false);
    }
  }

  async function handleUpdateQuota() {
    const q = parseInt(newQuota);
    if (isNaN(q) || q <= 0) {
      setQuotaError('Please enter a valid number');
      return;
    }
    if (q > planMax) {
      setQuotaError(`Your plan maximum is ${planMax / 1024} GB per mailbox.`);
      return;
    }
    setUpdatingQuota(true);
    setQuotaError('');
    try {
      await onUpdateQuota(mailbox.email, q);
      setShowQuotaModal(false);
    } catch (err: any) {
      setQuotaError(err.error || 'Failed to update quota');
    } finally {
      setUpdatingQuota(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(mailbox.email);
      setShowDeleteModal(false);
    } catch (err: any) {
      setDeleteError(err.error || 'Failed to delete mailbox');
    } finally {
      setDeleting(false);
    }
  }

  function closePwModal() {
    setShowPwModal(false);
    setNewPassword('');
    setPwError('');
  }

  function closeQuotaModal() {
    setShowQuotaModal(false);
    setNewQuota(mailbox.quota_mb.toString());
    setQuotaError('');
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeleteError('');
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                {(mailbox.quota_used_mb ?? 0).toFixed(1)} MB / {mailbox.quota_mb >= 1024
                  ? `${(mailbox.quota_mb / 1024).toFixed(1)} GB`
                  : `${mailbox.quota_mb} MB`}
              </span>
              <button 
                onClick={() => setShowQuotaModal(true)}
                style={{ 
                  background: 'var(--cream-2)', 
                  border: '1px solid var(--primary)', 
                  color: 'var(--primary)', 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--cream-2)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
              >
                Edit Quota
              </button>
            </div>
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
              onClick={() => setShowPwModal(true)}
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
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: 'white',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--danger)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = 'var(--danger)';
              }}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div
              style={modalOverlay}
              onClick={closeDeleteModal}
            >
              <div
                style={modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 style={{ ...modalTitle, color: 'var(--danger)' }}>Delete Mailbox?</h3>
                  <p style={modalSubTitle}>
                    This action is permanent. All emails and data for <strong style={{ color: 'var(--ink)' }}>{mailbox.email}</strong> will be erased from our servers immediately.
                  </p>
                </div>

                {deleteError && <span style={errorText}>{deleteError}</span>}

                <div style={modalActions}>
                  <button onClick={closeDeleteModal} style={btnGhost}>Cancel</button>
                  <button 
                    onClick={handleDelete} 
                    disabled={deleting} 
                    style={{ ...btnPrimary, background: 'var(--danger)' }}
                  >
                    {deleting ? 'Deleting…' : 'Yes, Delete Mailbox'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Reset password modal */}
      {showPwModal && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div
              style={modalOverlay}
              onClick={closePwModal}
            >
              <div
                style={modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 style={modalTitle}>Security Reset</h3>
                  <p style={modalSubTitle}>
                    Enter a new access password for <strong style={{ color: 'var(--ink)' }}>{mailbox.email}</strong>.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                    style={modalInput(!!pwError)}
                    autoFocus
                  />
                  {pwError && <span style={errorText}>{pwError}</span>}
                </div>

                <div style={modalActions}>
                  <button onClick={closePwModal} style={btnGhost}>Cancel</button>
                  <button onClick={handleReset} disabled={resetting} style={btnPrimary}>
                    {resetting ? 'Applying…' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Edit Quota modal */}
      {showQuotaModal && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div
              style={modalOverlay}
              onClick={closeQuotaModal}
            >
              <div
                style={modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 style={modalTitle}>Manage Storage</h3>
                  <p style={modalSubTitle}>
                    Update the storage quota for <strong style={{ color: 'var(--ink)' }}>{mailbox.email}</strong>.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={newQuota}
                      onChange={(e) => setNewQuota(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateQuota()}
                      style={{ ...modalInput(!!quotaError), paddingRight: '3.5rem' }}
                      autoFocus
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600 }}>MB</span>
                  </div>
                  {quotaError && <span style={errorText}>{quotaError}</span>}
                </div>

                <div style={modalActions}>
                  <button onClick={closeQuotaModal} style={btnGhost}>Cancel</button>
                  <button onClick={handleUpdateQuota} disabled={updatingQuota} style={btnPrimary}>
                    {updatingQuota ? 'Saving…' : 'Update Quota'}
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

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26, 3, 1, 0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContent: React.CSSProperties = {
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
};

const modalTitle: React.CSSProperties = {
  color: 'var(--ink)',
  margin: '0 0 0.5rem',
  fontSize: '1.25rem',
  fontWeight: 700,
  fontFamily: 'var(--font-heading)',
};

const modalSubTitle: React.CSSProperties = {
  color: 'var(--muted)',
  margin: 0,
  fontSize: '0.875rem',
  lineHeight: 1.5,
};

const modalInput = (hasError: boolean): React.CSSProperties => ({
  background: 'var(--bg-page)',
  border: `2px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
  borderRadius: '8px',
  color: 'var(--ink)',
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  width: '100%',
  boxSizing: 'border-box' as const,
});

const errorText: React.CSSProperties = {
  color: 'var(--danger)',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const modalActions: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: '0.5rem',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--muted)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-md)',
};
