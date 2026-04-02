import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

const MAILCOW_HOST = import.meta.env.VITE_MAILCOW_HOST ?? 'mail.zeemail.co.zw';
const MX_RECORD = `10 ${MAILCOW_HOST}`;
const SPF_RECORD = `v=spf1 mx a:${MAILCOW_HOST} ~all`;

type DnsProvider = 'cloudflare' | 'other' | 'third-party';

interface StepDnsInstructionsProps {
  domain: string;
  clientId: string | null;
  previousEmailProvider: string | null;
}

const codeStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.625rem 0.875rem',
  background: '#0a0000',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: '#86efac',
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  wordBreak: 'break-all',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default function StepDnsInstructions({
  domain,
  clientId,
}: StepDnsInstructionsProps) {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<DnsProvider>('other');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    mxRecords: any[];
    spfVerified: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!clientId) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await apiRequest<{
        verified: boolean;
        mxRecords: any[];
        spfVerified: boolean;
      }>('POST', `/api/clients/${clientId}/verify-dns`);
      setVerificationResult(res);
      if (!res.verified) {
        setError('MX records not detected yet. DNS changes can take some time to propagate.');
      }
    } catch (err: any) {
      setError(err?.error ?? 'Verification failed. Please try again later.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div data-testid="step-dns-instructions" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Update your DNS records</h2>

      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        To start receiving email at <strong style={{ color: 'var(--text-cream)' }}>{domain}</strong>,
        you need to add the following DNS records with your domain provider.
      </p>

      {/* Verification Result Alert */}
      {verificationResult?.verified ? (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ color: '#86efac', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✓ DNS Verified Successfully
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            We've detected your DNS settings. Your account is now active and ready for use.
          </p>
          <button
            onClick={() => navigate('/portal')}
            style={{
              padding: '0.5rem 1rem',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '1rem',
          color: '#fca5a5',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      ) : null}

      {/* Provider selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={labelStyle}>Who manages your DNS?</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {([
            { id: 'cloudflare', label: 'Cloudflare' },
            { id: 'webzim', label: 'WebZim' },
            { id: 'other', label: 'Other provider' },
            { id: 'third-party', label: 'Someone else' },
          ] as Array<{ id: DnsProvider; label: string }>).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              data-testid={`provider-${id}`}
              aria-pressed={provider === id}
              onClick={() => setProvider(id)}
              style={{
                padding: '0.375rem 0.875rem',
                background: provider === id ? 'var(--primary)' : 'var(--bg-card)',
                border: `1px solid ${provider === id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '999px',
                color: 'var(--text-cream)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* MX Record */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>MX Record</span>
            {verificationResult && (
              <span style={{ fontSize: '0.75rem', color: verificationResult.verified ? '#86efac' : '#fca5a5' }}>
                {verificationResult.verified ? 'Detected' : 'Not found'}
              </span>
            )}
          </div>
          <code data-testid="mx-record-value" style={codeStyle}>{MX_RECORD}</code>
          {provider === 'cloudflare' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tip: Set proxy to <strong>DNS Only</strong> (gray cloud).
            </span>
          )}
        </div>

        {/* SPF Record */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>SPF Record (TXT)</span>
            {verificationResult && (
              <span style={{ fontSize: '0.75rem', color: verificationResult.spfVerified ? '#86efac' : '#fca5a5' }}>
                {verificationResult.spfVerified ? 'Detected' : 'Not found'}
              </span>
            )}
          </div>
          <code data-testid="spf-record-value" style={codeStyle}>{SPF_RECORD}</code>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        {!verificationResult?.verified && (
          <button
            onClick={handleVerify}
            disabled={verifying || !clientId}
            style={{
              padding: '0.75rem 1.5rem',
              background: verifying ? 'var(--bg-card)' : 'var(--primary)',
              border: verifying ? '1px solid var(--border)' : 'none',
              borderRadius: '8px',
              color: 'var(--text-cream)',
              fontWeight: 600,
              cursor: verifying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            {verifying ? 'Verifying...' : 'Verify DNS Now'}
          </button>
        )}

        <button
          onClick={() => navigate('/portal')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Skip for now
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0, fontStyle: 'italic' }}>
        DNS changes can take up to 24–48 hours to propagate globally. You can proceed to your dashboard and verify later if needed.
      </p>
    </div>
  );
}
