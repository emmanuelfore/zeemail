import { useState, useEffect } from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
=======
import { NavLink, useNavigate } from 'react-router-dom';
>>>>>>> 7d7a145af8ec4fa5a843046524cac7cef90f3cdf
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { SupportTicketForm } from '../../components/portal/SupportTicketForm';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Client } from '../../types/index';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card, var(--surface-container-low))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '10px',
  padding: '1.25rem',
};

export function PortalSupportPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [clientLoading, setClientLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const { tickets, loading: ticketsLoading, createTicket } = useTickets(clientId);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    async function loadClient() {
      setClientLoading(true);
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profile!.id)
        .single<Pick<Client, 'id'>>();
      if (!cancelled && data) setClientId(data.id);
      if (!cancelled) setClientLoading(false);
    }

    loadClient();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const loading = clientLoading || ticketsLoading;

  async function handleSubmit(subject: string, message: string): Promise<boolean> {
    const ok = await createTicket(subject, message);
    if (ok) setShowForm(false);
    return ok;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>
            Support
          </h1>
          <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0, fontSize: '0.9rem' }}>
            Submit and track your support requests.
          </p>
        </div>
        {!showForm && tickets.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            New ticket
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <div style={cardStyle}>
          <h2 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
            New ticket
          </h2>
          <SupportTicketForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Ticket list */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} height="52px" borderRadius="6px" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            heading="No support tickets"
            subtext="Have a question or issue? Open a ticket and we'll get back to you."
            actionLabel="New ticket"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, var(--border))' }}>
                {['Subject', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    style={{
                      color: 'var(--text-muted, var(--on-surface-variant))',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  data-testid="ticket-row"
                  style={{ borderBottom: '1px solid rgba(62,7,3,0.4)', cursor: 'pointer' }}
                  onClick={() => navigate(`/portal/support/${ticket.id}`)}
                  className="hover-row"
                >
                  <td style={{ padding: '0.625rem 0.75rem', color: 'var(--ink, var(--on-background))', fontWeight: 600 }}>
                    {ticket.subject}
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', color: 'var(--muted, var(--on-surface-variant))' }}>
                    {new Date(ticket.created_at).toLocaleDateString()}
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
