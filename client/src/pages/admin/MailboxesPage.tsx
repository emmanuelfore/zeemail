import { useState, useMemo, useCallback } from 'react';
import { useMailboxes } from '../../hooks/useMailboxes';
import { useClients } from '../../hooks/useClients';
import { useToast } from '../../hooks/useToast';
import { MailboxesTable } from '../../components/admin/MailboxesTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { ApiError } from '../../types/index';

export function MailboxesPage() {
  const { mailboxes, loading } = useMailboxes();
  const { clients } = useClients();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  // Build a map of client_id -> company_name for display
  const clientNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) {
      map[c.id] = c.company_name;
    }
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mailboxes;
    return mailboxes.filter((m) => {
      const domain = m.email.split('@')[1] ?? '';
      return m.email.toLowerCase().includes(q) || domain.toLowerCase().includes(q);
    });
  }, [mailboxes, search]);

  const handleToggle = useCallback((email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((emails: string[]) => {
    setSelected((prev) => {
      const allSelected = emails.every((e) => prev.has(e));
      if (allSelected) {
        const next = new Set(prev);
        emails.forEach((e) => next.delete(e));
        return next;
      } else {
        const next = new Set(prev);
        emails.forEach((e) => next.add(e));
        return next;
      }
    });
  }, []);

  const handleSuspendSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    const emails = Array.from(selected);
    let successCount = 0;
    for (const email of emails) {
      try {
        await apiRequest('PUT', `/api/mailboxes/${encodeURIComponent(email)}`, {
          active: '0',
        });
        successCount++;
      } catch (err) {
        toast(`Failed to suspend ${email}: ${(err as ApiError).error ?? 'Unknown error'}`, 'error');
      }
    }
    if (successCount > 0) {
      toast(`Suspended ${successCount} mailbox${successCount > 1 ? 'es' : ''}`, 'success');
      setSelected(new Set());
    }
    setActionLoading(false);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    const emails = Array.from(selected);
    let successCount = 0;
    for (const email of emails) {
      try {
        await apiRequest('DELETE', `/api/mailboxes/${encodeURIComponent(email)}`);
        const { error } = await supabase
          .from('mailboxes')
          .delete()
          .eq('email', email);
        if (error) throw error;
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : (err as ApiError).error ?? 'Unknown error';
        toast(`Failed to delete ${email}: ${msg}`, 'error');
      }
    }
    if (successCount > 0) {
      toast(`Deleted ${successCount} mailbox${successCount > 1 ? 'es' : ''}`, 'success');
      setSelected(new Set());
    }
    setActionLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--on-background)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    minWidth: '260px',
    flex: '1 1 260px',
  };

  const actionBtnStyle = (danger?: boolean): React.CSSProperties => ({
    background: danger ? 'rgba(248,113,113,0.15)' : 'rgba(140,16,7,0.2)',
    color: danger ? '#f87171' : 'var(--on-background)',
    border: `1px solid ${danger ? 'rgba(248,113,113,0.4)' : 'var(--border)'}`,
    borderRadius: '6px',
    padding: '0.5rem 0.875rem',
    cursor: selected.size === 0 || actionLoading ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    opacity: selected.size === 0 || actionLoading ? 0.5 : 1,
    transition: 'opacity 0.15s',
  });

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
        <h1 style={{ color: 'var(--on-background)', margin: 0 }}>Mailboxes</h1>
        {selected.size > 0 && (
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
            {selected.size} selected
          </span>
        )}
      </div>

      {/* Search + bulk actions */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search by email or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
          aria-label="Search mailboxes"
        />
        <button
          onClick={handleSuspendSelected}
          disabled={selected.size === 0 || actionLoading}
          style={actionBtnStyle()}
          aria-label="Suspend selected mailboxes"
        >
          Suspend selected
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={selected.size === 0 || actionLoading}
          style={actionBtnStyle(true)}
          aria-label="Delete selected mailboxes"
        >
          Delete selected
        </button>
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
            heading={search ? 'No mailboxes match your search' : 'No mailboxes yet'}
            subtext={
              search
                ? 'Try a different email address or domain name.'
                : 'Mailboxes will appear here once clients are set up.'
            }
          />
        ) : (
          <MailboxesTable
            mailboxes={filtered}
            selected={selected}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            clientNames={clientNames}
          />
        )}
      </div>
    </div>
  );
}
