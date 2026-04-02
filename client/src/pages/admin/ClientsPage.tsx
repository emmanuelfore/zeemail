import { useState, useMemo } from 'react';
import { useClients } from '../../hooks/useClients';
import { ClientsTable } from '../../components/admin/ClientsTable';
import { AddClientForm } from '../../components/admin/AddClientForm';
import { AdminQueue } from '../../components/admin/AdminQueue';
import { SlideOver } from '../../components/shared/SlideOver';
import { EmptyState } from '../../components/shared/EmptyState';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import type { Plan, ClientStatus } from '../../types/index';

export function ClientsPage() {
  const { clients, loading } = useClients();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<Plan | ''>('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.company_name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q);
      const matchesPlan = !planFilter || c.plan === planFilter;
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [clients, search, planFilter, statusFilter]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--on-background)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <AdminQueue />

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
        <h1 style={{ color: 'var(--on-background)', margin: 0 }}>Clients</h1>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Add client
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search by company or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: '220px', flex: '1 1 220px' }}
          aria-label="Search clients"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as Plan | '')}
          style={{ ...inputStyle, minWidth: '140px' }}
          aria-label="Filter by plan"
        >
          <option value="">All plans</option>
          <option value="starter">Starter</option>
          <option value="business">Business</option>
          <option value="pro">Pro</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClientStatus | '')}
          style={{ ...inputStyle, minWidth: '140px' }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
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
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} height="44px" borderRadius="6px" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            heading="No clients yet"
            subtext="Add your first client to get started."
            actionLabel="Add client"
            onAction={() => setAddOpen(true)}
          />
        ) : (
          <ClientsTable clients={filtered} />
        )}
      </div>

      {/* Add client slide-over */}
      <SlideOver isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add client">
        <AddClientForm onSuccess={() => setAddOpen(false)} />
      </SlideOver>
    </div>
  );
}
