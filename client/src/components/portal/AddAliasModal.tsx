import { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import type { ApiError } from '../../types';

interface AddAliasModalProps {
  domain: string;
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
  maxWidth: '480px',
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

export function AddAliasModal({ domain, onClose, onSuccess }: AddAliasModalProps) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState('');
  const [goto, setGoto] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prefix.trim() || !goto.trim()) {
      toast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('POST', '/api/aliases/add', {
        address: `${prefix.trim().toLowerCase()}@${domain}`,
        goto: goto.trim().toLowerCase(),
      });
      toast('Forwarding created successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to create forwarding', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-cream)', margin: 0, fontSize: '1.25rem' }}>Add Forwarding / Group</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Redirect mail to one or more addresses.</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Alias Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                style={{ ...inputStyle, flex: 1 }} 
                placeholder="e.g. support or info" 
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                autoFocus
              />
              <span style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>@{domain}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
              Emails sent to this address will be forwarded.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Forward to Recipient(s)</label>
            <textarea 
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
              placeholder="e.g. john@gmail.com, boss@company.zw" 
              value={goto}
              onChange={(e) => setGoto(e.target.value)}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
              Separate multiple recipients with commas. Use this for <strong>forwarding</strong> (one recipient) or <strong>group emails</strong> (multiple recipients).
            </p>
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
              {loading ? 'Creating...' : 'Create Forwarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
