import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

interface PaymentInitiateResponse {
  redirectUrl: string;
  pollUrl: string;
  reference: string;
}

interface StepPaymentProps {
  clientId: string;
  amount: number;
  email: string;
  phone: string;
  onPaymentConfirmed: () => void;
  onPayLater: () => void;
}

type PaymentStatus = 'idle' | 'initiating' | 'polling' | 'confirmed' | 'failed';

const POLL_INTERVAL_MS = 5000;

export default function StepPayment({
  clientId,
  amount,
  email,
  phone,
  onPaymentConfirmed,
  onPayLater,
}: StepPaymentProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function startPolling() {
    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await apiRequest<{ status: string }>(
          'GET',
          `/api/payments/poll/${clientId}`
        );

        if (data.status === 'confirmed' || data.status === 'paid') {
          stopPolling();
          setStatus('confirmed');
          onPaymentConfirmed();
          navigate(`/register/confirm?id=${clientId}`);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          stopPolling();
          setStatus('failed');
          setErrorMessage('Payment was not completed. Please try again.');
        }
        // Otherwise keep polling (pending / awaiting)
      } catch {
        // Network error — keep polling, don't surface transient errors
      }
    }, POLL_INTERVAL_MS);
  }

  async function initiatePayment() {
    setStatus('initiating');
    setErrorMessage('');

    try {
      const data = await apiRequest<PaymentInitiateResponse>(
        'POST',
        '/api/payments/initiate',
        { clientId, amount, email, phone }
      );

      // Open Paynow redirect in new tab
      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');

      setStatus('polling');
      await startPolling();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? String((err as { error: string }).error)
          : 'Payment gateway unavailable. Please try again.';
      setErrorMessage(msg);
      setStatus('failed');
    }
  }

  return (
    <div data-testid="step-payment" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Complete payment</h2>

      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Amount due (first month)</span>
        <span
          data-testid="payment-amount"
          style={{ color: 'var(--text-cream)', fontWeight: 700, fontSize: '1.25rem' }}
        >
          ${amount}
        </span>
      </div>

      {status === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            data-testid="btn-pay"
            onClick={initiatePayment}
            style={{
              alignSelf: 'flex-start',
              padding: '0.625rem 1.5rem',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-cream)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Pay with Paynow
          </button>
          <button
            type="button"
            data-testid="btn-pay-later"
            onClick={onPayLater}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Pay later — log in to my account
          </button>
        </div>
      )}

      {status === 'initiating' && (
        <p data-testid="payment-initiating" style={{ color: 'var(--text-muted)', margin: 0 }}>
          Opening Paynow…
        </p>
      )}

      {status === 'polling' && (
        <div data-testid="payment-polling" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Waiting for payment confirmation…
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Complete the payment in the Paynow tab. This page will update automatically.
          </p>
        </div>
      )}

      {status === 'confirmed' && (
        <p data-testid="payment-confirmed" style={{ color: '#86efac', margin: 0 }}>
          ✓ Payment confirmed! Redirecting…
        </p>
      )}

      {status === 'failed' && (
        <div data-testid="payment-failed" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
            {errorMessage || 'Payment failed. Please try again.'}
          </p>
          <button
            type="button"
            data-testid="btn-retry"
            onClick={() => {
              setStatus('idle');
              setErrorMessage('');
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '0.5rem 1.25rem',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-cream)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
