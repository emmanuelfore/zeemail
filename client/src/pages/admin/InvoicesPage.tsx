import { useMemo, useState } from 'react';
import { useInvoices } from '../../hooks/useInvoices';
import { useClients } from '../../hooks/useClients';
import { InvoicesTable } from '../../components/admin/InvoicesTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import type { InvoiceStatus } from '../../types/index';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--surface-container-low)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        flex: '1 1 200px',
        minWidth: '180px',
      }}
    >
      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', margin: '0 0 0.375rem' }}>{label}</p>
      <p style={{ color: 'var(--on-background)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}

export function InvoicesPage() {
  const { invoices, loading } = useInvoices();
  const { clients } = useClients();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const clientNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) {
      map[c.id] = c.company_name;
    }
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!statusFilter) return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Summary: total collected this month (paid invoices where paid_at is in current month)
  const totalCollectedThisMonth = useMemo(() => {
    const now = new Date();
    return invoices
      .filter((inv) => {
        if (inv.status !== 'paid' || !inv.paid_at) return false;
        const paidDate = new Date(inv.paid_at);
        return (
          paidDate.getFullYear() === now.getFullYear() &&
          paidDate.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  // Summary: total outstanding (unpaid + overdue)
  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--on-background)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    minWidth: '160px',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ color: 'var(--on-background)', margin: 0 }}>Invoices</h1>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {loading ? (
          <>
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <SkeletonLoader height="80px" borderRadius="10px" />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <SkeletonLoader height="80px" borderRadius="10px" />
            </div>
          </>
        ) : (
          <>
            <SummaryCard
              label="Collected this month"
              value={`$${totalCollectedThisMonth.toFixed(2)}`}
            />
            <SummaryCard
              label="Total outstanding"
              value={`$${totalOutstanding.toFixed(2)}`}
            />
          </>
        )}
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          style={inputStyle}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table / empty / loading */}
      <div
        style={{
          background: 'var(--surface-container-low)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} height="44px" borderRadius="6px" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            heading={statusFilter ? 'No invoices match this filter' : 'No invoices yet'}
            subtext={
              statusFilter
                ? 'Try a different status filter.'
                : 'Invoices will appear here once they are created for clients.'
            }
          />
        ) : (
          <InvoicesTable invoices={filtered} clientNames={clientNames} />
        )}
      </div>
    </div>
  );
}
