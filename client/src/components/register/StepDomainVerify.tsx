import { useState } from 'react';
import { apiRequest } from '../../lib/api';

interface StepDomainVerifyProps {
  domain: string;
  onDomainChange: (domain: string) => void;
  onNext: () => void;
  previousEmailProvider: string | null;
  onProviderDetected: (provider: string | null) => void;
}

type VerifyState = 'idle' | 'loading' | 'confirmed' | 'not_found' | 'error';

export default function StepDomainVerify({
  domain,
  onDomainChange,
  onNext,
  previousEmailProvider,
  onProviderDetected,
}: StepDomainVerifyProps) {
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  async function handleVerify() {
    const trimmed = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    if (!trimmed) return;

    setVerifyState('loading');
    setErrorMessage('');
    onProviderDetected(null);
    onDomainChange(trimmed);

    try {
      // Check domain exists (any TLD — no tld param means server checks as-is)
      const checkData = await apiRequest<{ available: boolean }>(
        'GET',
        `/api/domains/check?name=${encodeURIComponent(trimmed)}&tld=`
      );

      // Domain must NOT be available (i.e., it must already be registered)
      if (checkData.available) {
        setVerifyState('not_found');
        return;
      }

      // Domain is registered — detect MX provider
      setVerifyState('confirmed');

      try {
        const mxData = await apiRequest<{ provider: string | null }>(
          'GET',
          `/api/domains/mx?domain=${encodeURIComponent(trimmed)}`
        );
        onProviderDetected(mxData.provider ?? null);
      } catch {
        // MX detection is best-effort; domain is still confirmed
        onProviderDetected(null);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? String((err as { error: string }).error)
          : 'Domain verification failed. Please try again.';
      setErrorMessage(msg);
      setVerifyState('error');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleVerify();
    }
  }


  const canProceed = verifyState === 'confirmed';

  return (
    <div data-testid="step-domain-verify" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Verify your domain</h2>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        Enter your existing domain to confirm it's registered and active.
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input
          type="text"
          aria-label="Domain name"
          data-testid="domain-input"
          placeholder="yourbusiness.co.zw"
          value={domain}
          onChange={(e) => {
            onDomainChange(e.target.value);
            setVerifyState('idle');
            setErrorMessage('');
            onProviderDetected(null);
          }}
          onKeyDown={handleKeyDown}

          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-cream)',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <button
          type="button"
          data-testid="btn-verify"
          disabled={verifyState === 'loading' || !domain.trim()}
          onClick={handleVerify}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '6px',
            color: 'var(--text-cream)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: verifyState === 'loading' || !domain.trim() ? 'not-allowed' : 'pointer',
            opacity: verifyState === 'loading' || !domain.trim() ? 0.6 : 1,
          }}
        >
          {verifyState === 'loading' ? 'Verifying…' : 'Verify'}
        </button>
      </div>

      {/* Status messages */}
      {verifyState === 'confirmed' && (
        <div data-testid="verify-confirmed">
          <p style={{ color: '#86efac', margin: '0 0 0.25rem' }}>
            ✓ Domain verified and active.
          </p>
          <p data-testid="email-provider-info" style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {previousEmailProvider
              ? `Currently using ${previousEmailProvider}`
              : 'No current email provider detected'}
          </p>
        </div>
      )}

      {verifyState === 'not_found' && (
        <p data-testid="verify-not-found" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
          This domain does not appear to be registered. Please check the spelling and try again.
        </p>
      )}

      {verifyState === 'error' && (
        <p data-testid="verify-error" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
          {errorMessage || 'Domain verification failed. Please try again.'}
        </p>
      )}

      {/* Continue */}
      <button
        type="button"
        data-testid="btn-next"
        disabled={!canProceed}
        onClick={onNext}
        style={{
          alignSelf: 'flex-start',
          padding: '0.625rem 1.5rem',
          background: canProceed ? 'var(--primary)' : 'var(--primary-dark)',
          border: 'none',
          borderRadius: '6px',
          color: 'var(--text-cream)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          opacity: canProceed ? 1 : 0.5,
        }}
      >
        Continue
      </button>
    </div>
  );
}
