import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Availability = 'idle' | 'loading' | 'available' | 'taken' | 'error';

interface StepDomainSearchProps {
  domain: string;
  availability: Availability;
  onDomainChange: (domain: string) => void;
  onAvailabilityChange: (status: Availability) => void;
  onNext: () => void;
}

export default function StepDomainSearch({
  domain,
  availability,
  onDomainChange,
  onAvailabilityChange,
  onNext,
}: StepDomainSearchProps) {
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced domain check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = domain.trim();
    if (!trimmed) {
      onAvailabilityChange('idle');
      setAlternatives([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      onAvailabilityChange('loading');
      setAlternatives([]);
      setErrorMessage('');

      try {
        const data = await apiRequest<{ available: boolean }>(
          'GET',
          `/api/domains/check?name=${encodeURIComponent(trimmed)}&tld=.co.zw`
        );

        if (data.available) {
          onAvailabilityChange('available');
        } else {
          onAvailabilityChange('taken');
          // Fetch suggestions
          try {
            const suggestions = await apiRequest<{ suggestions: string[] }>(
              'GET',
              `/api/domains/suggest?name=${encodeURIComponent(trimmed)}`
            );
            setAlternatives(suggestions.suggestions ?? []);
          } catch {
            // Suggestions are best-effort; don't surface this error
          }
        }
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'error' in err
            ? String((err as { error: string }).error)
            : 'Domain check failed. Please try again.';
        setErrorMessage(msg);
        onAvailabilityChange('error');
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  function handleChipClick(alt: string) {
    // Strip .co.zw suffix to get just the name part
    const name = alt.endsWith('.co.zw') ? alt.slice(0, -6) : alt;
    onDomainChange(name);
  }

  const canProceed = availability === 'available';

  return (
    <div data-testid="step-domain-search" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Find your domain</h2>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        Search for an available <strong>.co.zw</strong> domain for your business.
      </p>

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          aria-label="Domain name"
          data-testid="domain-input"
          placeholder="yourbusiness"
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
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
        <span
          style={{
            padding: '0.625rem 0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            fontSize: '1rem',
            whiteSpace: 'nowrap',
          }}
        >
          .co.zw
        </span>
      </div>

      {/* Availability states */}
      {availability === 'loading' && (
        <p data-testid="availability-loading" style={{ color: 'var(--text-muted)', margin: 0 }}>
          Checking availability…
        </p>
      )}

      {availability === 'available' && (
        <p data-testid="availability-available" style={{ color: '#86efac', margin: 0 }}>
          ✓ {domain}.co.zw is available!
        </p>
      )}

      {availability === 'taken' && (
        <div data-testid="availability-taken">
          <p style={{ color: 'var(--danger)', margin: '0 0 0.5rem' }}>
            ✗ {domain}.co.zw is already taken.
          </p>
          {alternatives.length > 0 && (
            <div>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                Try one of these instead:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {alternatives.map((alt) => (
                  <button
                    key={alt}
                    type="button"
                    data-testid={`chip-${alt}`}
                    onClick={() => handleChipClick(alt)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      color: 'var(--text-cream)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {availability === 'error' && (
        <p data-testid="availability-error" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
          {errorMessage || 'Domain check failed. Please try again.'}
        </p>
      )}

      {/* Continue button */}
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
