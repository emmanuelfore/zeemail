import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { PlanBadge } from '../shared/PlanBadge';
import type { Client } from '../../types/index';

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusPill({ status }: { status: string }) {
  const isUrgent = status === 'pending_domain';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: isUrgent ? 'rgba(248,113,113,0.15)' : 'rgba(250,204,21,0.15)',
        color: isUrgent ? '#f87171' : '#facc15',
        textTransform: 'capitalize',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function AdminQueue() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function fetchPending() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .in('status', ['pending_domain', 'pending_mailboxes'])
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!cancelled) setClients(data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPending();
    return () => { cancelled = true; };
  }, []);

  async function handleRunSetup(clientId: string) {
    setProvisioning((prev) => ({ ...prev, [clientId]: true }));
    try {
      await apiRequest('POST', `/api/clients/${clientId}/provision`);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } finally {
      setProvisioning((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  if (loading || clients.length === 0) return null;

  return (
    <div
      data-testid="admin-queue"
      style={{
        marginBottom: '1.5rem',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-container-low)',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ color: 'var(--on-background)', fontWeight: 600, fontSize: '0.875rem' }}>
          Pending Setup
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '9999px',
            backgroundColor: 'var(--primary)',
            color: 'var(--on-background)',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {clients.length}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              {['Domain', 'Company', 'Plan', 'Registered', 'Status', 'Action'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '0.625rem 0.75rem',
                    color: 'var(--on-surface-variant)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const isUrgent = client.status === 'pending_domain';
              const isRunning = provisioning[client.id] ?? false;
              const buttonLabel = isUrgent ? 'Domain registered — run setup' : 'Run setup now';

              return (
                <tr
                  key={client.id}
                  data-testid="queue-row"
                  style={{ borderBottom: '1px solid rgba(62,7,3,0.5)' }}
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--on-surface-variant)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {client.domain}
                      </span>
                      {isUrgent && (
                        <span
                          data-testid="urgent-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(248,113,113,0.2)',
                            color: '#f87171',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Urgent
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--on-background)', fontWeight: 500 }}>
                    {client.company_name}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <PlanBadge plan={client.plan} />
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {timeSince(client.created_at)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <StatusPill status={client.status} />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      data-testid="run-setup-btn"
                      disabled={isRunning}
                      onClick={() => handleRunSetup(client.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        background: isRunning ? 'rgba(140,16,7,0.4)' : 'var(--primary)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--on-background)',
                        padding: '0.375rem 0.75rem',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        opacity: isRunning ? 0.7 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {isRunning && (
                        <span
                          data-testid="spinner"
                          style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid rgba(255,240,196,0.3)',
                            borderTopColor: 'var(--on-background)',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.6s linear infinite',
                          }}
                        />
                      )}
                      {buttonLabel}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
