import { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import type { ApiError } from '../../types';

interface AddMailboxModalProps {
  clientId: string;
  domain: string;
  mailboxLimit: number;
  currentCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '2rem',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-cream)',
  padding: '0.75rem',
  fontSize: '0.9rem',
  width: '100%',
  outline: 'none',
  marginTop: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export function AddMailboxModal({ clientId, domain, mailboxLimit, currentCount, onClose, onSuccess }: AddMailboxModalProps) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isLimitReached = currentCount >= mailboxLimit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prefix.trim() || !password.trim()) {
      toast('Please fill in searching fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('POST', '/api/mailboxes/add', {
        local_part: prefix.trim(),
        domain,
        password,
        client_id: clientId,
        quota: 500, // Default quota for portal users
      });
      toast('Mailbox created successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to create mailbox', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--text-cream)', margin: 0, fontSize: '1.25rem' }}>Create New Mailbox</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
          >
            ×
          </button>
        </div>

        {isLimitReached ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You have reached your limit of <strong>{mailboxLimit}</strong> mailboxes for your current plan.
            </p>
            <button 
              onClick={onClose}
              style={{
                background: 'var(--primary)',
                color: 'var(--text-cream)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Contact Support to Upgrade
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  style={{ ...inputStyle, flex: 1 }} 
                  placeholder="e.g. john" 
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  autoFocus
                />
                <span style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>@{domain}</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input 
                type="password" 
                style={inputStyle} 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--text-cream)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Creating...' : 'Create Mailbox'}
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem' }}>
                {currentCount} of {mailboxLimit} mailboxes used
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
