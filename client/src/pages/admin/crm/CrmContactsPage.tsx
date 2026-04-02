import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Users } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { EmptyState } from '../../../components/shared/EmptyState';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { SlideOver } from '../../../components/shared/SlideOver';
import { CrmContactDetail } from '../../../components/admin/crm/CrmContactDetail';

export interface CrmContact {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  email_type: 'professional' | 'unprofessional' | 'unknown' | null;
  email_provider: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  address: string | null;
  google_place_id: string | null;
  source: string | null;
  pipeline_stage: string;
  pipeline_notes: string | null;
  last_contacted_at: string | null;
  follow_up_date: string | null;
  created_at: string;
}

function EmailBadge({ type, provider }: { type: string | null; provider: string | null }) {
  if (type === 'unprofessional') return (
    <span style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>
      Uses {provider ?? 'free email'}
    </span>
  );
  if (type === 'professional') return (
    <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>
      Professional
    </span>
  );
  return <span style={{ background: 'rgba(196,145,122,0.12)', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,145,122,0.3)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.75rem' }}>Unknown</span>;
}

export function CrmContactsPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const warmOnly = searchParams.get('filter') === 'warm';

  useEffect(() => {
    apiRequest<CrmContact[]>('GET', '/api/crm/contacts')
      .then(setContacts)
      .catch(() => toast('Failed to load contacts', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = contacts;
    if (warmOnly) list = list.filter((c) => c.email_type === 'unprofessional');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.business_name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contacts, search, warmOnly]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
    color: 'var(--on-background)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', flex: '1 1 240px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {warmOnly ? <Flame size={28} color="#e11d48" /> : <Users size={28} color="var(--primary)" />}
          <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            {warmOnly ? 'Warm Leads' : 'CRM Contacts'}
            {!loading && <span style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem' }}>({filtered.length})</span>}
          </h1>
        </div>
      </div>

      <input type="text" placeholder="Search by name, city, email…" value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />

      <div style={{ background: 'var(--surface-container-low)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} height="44px" borderRadius="6px" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState heading="No contacts" subtext="Import contacts from Google Maps or add manually." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Business', 'City', 'Phone', 'Email', 'Stage', 'Source'].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} style={{ borderBottom: '1px solid rgba(62,7,3,0.5)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,240,196,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.75rem', color: 'var(--on-background)', fontWeight: 500 }}>{c.business_name ?? '—'}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{c.city ?? '—'}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{c.phone ?? '—'}</td>
                    <td style={{ padding: '0.75rem' }}><EmailBadge type={c.email_type} provider={c.email_provider} /></td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'capitalize' }}>{c.pipeline_stage}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>{c.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.business_name ?? 'Contact'}>
        {selected && (
          <CrmContactDetail
            contact={selected}
            onUpdate={(updated) => {
              setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
              setSelected(updated);
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </SlideOver>
    </div>
  );
}
