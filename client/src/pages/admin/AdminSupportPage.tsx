import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LifeBuoy, Search } from 'lucide-react';
import type { SupportTicket, Client } from '../../types';

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)'
};

export function AdminSupportPage() {
  const [tickets, setTickets] = useState<(SupportTicket & { client: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*, client:clients(*)')
          .order('created_at', { ascending: false });
        
        if (data) setTickets(data as any);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.client.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.client.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Support Queue
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0', fontSize: '0.925rem' }}>
            Manage client support requests and communications.
          </p>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '1rem' }}>
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search by subject, company, or domain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--cream-2)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {loading ? (
          <SkeletonLoader height="300px" borderRadius="12px" />
        ) : filtered.length === 0 ? (
          <EmptyState 
            heading="No tickets found" 
            subtext="Everything is quiet in the support queue." 
            icon={<LifeBuoy size={48} />}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Subject', 'Status', 'Opened'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => navigate(`/admin/support/${t.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t.client.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t.client.domain}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--ink)', fontWeight: 500 }}>
                    {t.subject}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
