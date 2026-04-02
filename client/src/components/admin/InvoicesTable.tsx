import { StatusBadge } from '../shared/StatusBadge';
import type { Invoice, InvoiceStatus } from '../../types/index';

interface InvoicesTableProps {
  invoices: Invoice[];
  clientNames: Record<string, string>;
}

export function InvoicesTable({ invoices, clientNames }: InvoicesTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            {['Client', 'Amount', 'Status', 'Due Date', 'Actions'].map((col) => (
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
          {invoices.map((invoice) => {
            const isOverdue = invoice.status === 'overdue';
            return (
              <tr
                key={invoice.id}
                data-testid="invoice-row"
                style={{
                  borderBottom: '1px solid rgba(62,7,3,0.5)',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    'rgba(255,240,196,0.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                }}
              >
                <td style={{ padding: '0.75rem', color: isOverdue ? '#F87171' : 'var(--on-background)' }}>
                  {clientNames[invoice.client_id] ?? '—'}
                </td>
                <td style={{ padding: '0.75rem', color: isOverdue ? '#F87171' : 'var(--on-background)', fontWeight: 500 }}>
                  ${invoice.amount.toFixed(2)}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <StatusBadge status={invoice.status as InvoiceStatus} />
                </td>
                <td style={{ padding: '0.75rem', color: isOverdue ? '#F87171' : 'var(--on-surface-variant)' }}>
                  {new Date(invoice.due_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>—</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
