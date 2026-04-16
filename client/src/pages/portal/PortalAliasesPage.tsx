import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { useToast } from '../../hooks/useToast';
import { apiRequest } from '../../lib/api';
import { AddAliasModal } from '../../components/portal/AddAliasModal';
import type { Client, Alias, ApiError } from '../../types/index';

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '1.5rem',
};

const label: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 0.25rem',
};

function AliasRow({ alias, onDelete }: { alias: Alias; onDelete: (id: string, address: string) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '1rem', color: 'var(--text-cream)', fontWeight: 600 }}>
        {alias.address}
      </td>
      <td style={{ padding: '1rem', color: 'var(--text-muted)', maxWidth: '300px', wordBreak: 'break-all' }}>
        {alias.goto.split(',').map((email, idx) => (
            <span key={idx} style={{ 
                display: 'inline-block', 
                background: 'rgba(255,255,255,0.05)', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '4px', 
                margin: '0.1rem',
                fontSize: '0.8rem'
            }}>
                {email.trim()}
            </span>
        ))}
      </td>
      <td style={{ padding: '1rem' }}>
        <StatusBadge status={alias.active ? 'active' : 'suspended'} />
      </td>
      <td style={{ padding: '1rem', textAlign: 'right' }}>
        <button
          onClick={() => {
            if (confirm(`Are you sure you want to delete forwarding for ${alias.address}?`)) {
              setDeleting(true);
              onDelete(alias.id, alias.address).finally(() => setDeleting(false));
            }
          }}
          disabled={deleting}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? 'Removing...' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

export function PortalAliasesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAliases = useCallback(async (domain: string) => {
    try {
      const data = await apiRequest<Alias[]>('GET', `/api/aliases/${domain}`);
      // Mailcow might return them in different formats, but we'll assume array
      setAliases(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('Fetch aliases error:', err);
      // Don't toast on first load if it's just empty
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profile!.id)
        .single();

      if (clientError) throw clientError;
      if (!clientData) return;
      setClient(clientData);

      await fetchAliases(clientData.domain);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast, fetchAliases]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteAlias(id: string, address: string) {
    try {
      await apiRequest('DELETE', `/api/aliases/${id}?address=${encodeURIComponent(address)}`);
      setAliases(prev => prev.filter(a => a.id !== id));
      toast('Forwarding removed', 'success');
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to remove forwarding', 'error');
    }
  }

  const canAdd = client?.status && client.status !== 'suspended';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-cream)', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Forwarding & Groups</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Redirect emails from one address to one or more recipients.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!loading && canAdd && (
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Add Forwarding
            </button>
          )}
        </div>
      </div>

      <div style={{ ...card, display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(21, 128, 61, 0.05)', borderColor: 'rgba(21, 128, 61, 0.2)' }}>
        <div style={{ color: 'var(--primary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            <strong>Usage:</strong> Use forwarding for things like <em>sales@{client?.domain}</em> going to your Gmail, or create a group like <em>team@{client?.domain}</em> that redirects to multiple staff members.
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} height="48px" borderRadius="6px" />)}
          </div>
        ) : aliases.length === 0 ? (
          <EmptyState
            heading="No forwardings set up"
            subtext="You haven't created any email redirects yet."
            actionLabel={canAdd ? "Add Forwarding" : undefined}
            onAction={canAdd ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  {['Alias', 'Recipients', 'Status', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '0.625rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias) => (
                  <AliasRow
                    key={alias.id}
                    alias={alias}
                    onDelete={handleDeleteAlias}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && client && (
        <AddAliasModal 
          domain={client.domain}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchAliases(client.domain)}
        />
      )}
    </div>
  );
}
