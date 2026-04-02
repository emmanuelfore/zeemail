import { useNavigate } from 'react-router-dom';
import { PlanBadge } from '../shared/PlanBadge';
import { StatusBadge } from '../shared/StatusBadge';
import type { Client } from '../../types/index';

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const navigate = useNavigate();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border)',
              textAlign: 'left',
            }}
          >
            {['Company', 'Domain', 'Plan', 'Mailboxes', 'Status', 'DNS Status', 'Actions'].map(
              (col) => (
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
              )
            )}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              data-testid="client-row"
              style={{
                borderBottom: '1px solid rgba(62,7,3,0.5)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLTableRowElement).style.background =
                  'rgba(255,240,196,0.03)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
              }
            >
              <td style={{ padding: '0.75rem', color: 'var(--on-background)', fontWeight: 500 }}>
                {client.company_name}
              </td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                  {client.domain}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                <PlanBadge plan={client.plan} />
              </td>
              <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                0 / {client.mailbox_limit}
              </td>
              <td style={{ padding: '0.75rem' }}>
                <StatusBadge status={client.status} />
              </td>
              <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                {client.dns_status === 'healthy' ? (
                  <span style={{ color: '#86efac' }}>✅ Healthy</span>
                ) : client.dns_status === 'issues' ? (
                  <span style={{ color: '#fca5a5' }}>⚠️ Issues</span>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td style={{ padding: '0.75rem' }}>
                <button
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--on-background)',
                    padding: '0.25rem 0.625rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
