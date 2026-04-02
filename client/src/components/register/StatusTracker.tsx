import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ClientStatus } from '../../types';

interface StatusTrackerProps {
  clientId: string;
  initialStatus: ClientStatus;
  path: 'A' | 'B';
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  pending_payment: 'Awaiting payment',
  pending_domain: 'Domain registration (admin step)',
  pending_mailboxes: 'Setting up mailboxes',
  pending_mx: 'Waiting for DNS propagation',
  active: 'Account active',
  provisioning_error: 'Setup error',
  pending: 'Pending',
  pending_dns: 'Configuring DNS',
  suspended: 'Account suspended',
};

const PATH_A_STEPS: ClientStatus[] = [
  'pending_payment',
  'pending_domain',
  'pending_mailboxes',
  'active',
];

const PATH_B_STEPS: ClientStatus[] = [
  'pending_payment',
  'pending_mailboxes',
  'pending_mx',
  'active',
];

export default function StatusTracker({ clientId, initialStatus, path }: StatusTrackerProps) {
  const [status, setStatus] = useState<ClientStatus>(initialStatus);

  useEffect(() => {
    const channel = supabase
      .channel(`client-status-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `id=eq.${clientId}`,
        },
        (payload) => {
          setStatus(payload.new.status as ClientStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const steps = path === 'A' ? PATH_A_STEPS : PATH_B_STEPS;

  if (status === 'provisioning_error') {
    return (
      <div
        data-testid="status-error-card"
        role="alert"
        style={{
          padding: '1.25rem',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid var(--danger)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <p style={{ color: 'var(--danger)', fontWeight: 600, margin: 0 }}>
          ⚠ {STATUS_LABELS.provisioning_error}
        </p>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Something went wrong during account setup. Please contact support so we can resolve this
          quickly.
        </p>
        <a
          data-testid="support-contact-link"
          href="mailto:support@mailcow.co.zw"
          style={{ color: 'var(--primary)', fontSize: '0.9rem' }}
        >
          support@mailcow.co.zw
        </a>
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <ol
      data-testid="status-step-list"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step}
            data-testid={`status-step-${step}`}
            aria-current={isCurrent ? 'step' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: isCurrent ? 'var(--bg-card)' : 'transparent',
              border: isCurrent ? '1px solid var(--primary)' : '1px solid transparent',
              borderRadius: '6px',
              opacity: !isCompleted && !isCurrent ? 0.45 : 1,
            }}
          >
            <span
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
                background: isCompleted
                  ? '#86efac'
                  : isCurrent
                  ? 'var(--primary)'
                  : 'var(--border)',
                color: isCompleted || isCurrent ? '#000' : 'var(--text-muted)',
              }}
            >
              {isCompleted ? '✓' : index + 1}
            </span>
            <span
              data-testid={`status-label-${step}`}
              style={{
                color: isCurrent ? 'var(--text-cream)' : 'var(--text-muted)',
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
