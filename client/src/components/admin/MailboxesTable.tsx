import { StatusBadge } from '../shared/StatusBadge';
import type { Mailbox } from '../../types/index';

interface MailboxesTableProps {
  mailboxes: Mailbox[];
  selected: Set<string>;
  onToggle: (email: string) => void;
  onToggleAll: (emails: string[]) => void;
  clientNames: Record<string, string>;
}

export function MailboxesTable({
  mailboxes,
  selected,
  onToggle,
  onToggleAll,
  clientNames,
}: MailboxesTableProps) {
  const allSelected = mailboxes.length > 0 && mailboxes.every((m) => selected.has(m.email));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '0.625rem 0.75rem', color: 'var(--on-surface-variant)', width: '40px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(mailboxes.map((m) => m.email))}
                aria-label="Select all mailboxes"
                style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </th>
            {['Email', 'Domain', 'Status', 'Client', 'Quota'].map((col) => (
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
          {mailboxes.map((mailbox) => {
            const domain = mailbox.email.split('@')[1] ?? '';
            const isSelected = selected.has(mailbox.email);
            return (
              <tr
                key={mailbox.id}
                data-testid="mailbox-row"
                style={{
                  borderBottom: '1px solid rgba(62,7,3,0.5)',
                  background: isSelected ? 'rgba(140,16,7,0.08)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'rgba(255,240,196,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(mailbox.email)}
                    aria-label={`Select ${mailbox.email}`}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--on-background)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {mailbox.email}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--on-surface-variant)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {domain}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <StatusBadge status={mailbox.status} />
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {clientNames[mailbox.client_id] ?? '—'}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {mailbox.quota_mb} MB
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
