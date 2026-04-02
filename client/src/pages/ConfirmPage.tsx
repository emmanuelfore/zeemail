import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import StatusTracker from '../components/register/StatusTracker';
import type { Client, ClientStatus } from '../types';

type LoadState = 'loading' | 'loaded' | 'error';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  pro: 'Pro',
};

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id') ?? '';

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoadState('error');
      return;
    }

    apiRequest<Client>('GET', `/api/clients/${clientId}`)
      .then((data) => {
        setClient(data);
        setLoadState('loaded');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [clientId]);

  if (loadState === 'loading') {
    return (
      <div
        data-testid="confirm-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page)',
          color: 'var(--text-muted)',
        }}
      >
        Loading…
      </div>
    );
  }

  if (loadState === 'error' || !client) {
    return (
      <div
        data-testid="confirm-error"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page)',
          color: 'var(--danger)',
        }}
      >
        Unable to load your account details. Please contact support.
      </div>
    );
  }

  const path: 'A' | 'B' = client.domain_owned ? 'A' : 'B';

  return (
    <div
      data-testid="confirm-page"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--text-cream)', margin: '0 0 0.25rem' }}>
            Registration received
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Track your account setup progress below.
          </p>
        </div>

        {/* Client summary */}
        <div
          data-testid="confirm-summary"
          style={{
            padding: '1.25rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Domain</span>
            <span data-testid="confirm-domain" style={{ color: 'var(--text-cream)', fontWeight: 600 }}>
              {client.domain}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Plan</span>
            <span data-testid="confirm-plan" style={{ color: 'var(--text-cream)', fontWeight: 600 }}>
              {PLAN_LABELS[client.plan] ?? client.plan}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
            <span data-testid="confirm-status" style={{ color: 'var(--text-cream)', fontWeight: 600 }}>
              {client.status}
            </span>
          </div>
        </div>

        {/* Real-time status tracker */}
        <div>
          <h2 style={{ color: 'var(--text-cream)', margin: '0 0 1rem', fontSize: '1rem' }}>
            Setup progress
          </h2>
          <StatusTracker
            clientId={client.id}
            initialStatus={client.status as ClientStatus}
            path={path}
          />
        </div>
      </div>
    </div>
  );
}
