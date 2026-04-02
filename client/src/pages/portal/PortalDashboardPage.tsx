import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { apiRequest } from '../../lib/api';
import { MetricCard } from '../../components/admin/MetricCard';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import type { Client, Mailbox, SupportTicket } from '../../types/index';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatStorage(totalMb: number): string {
  if (totalMb >= 1024) return `${(totalMb / 1024).toFixed(1)} GB`;
  return `${totalMb} MB`;
}

function renewalLabel(client: Client | null): string {
  if (!client?.next_renewal_date) return '-';
  const days = daysUntil(client.next_renewal_date);
  const dateStr = new Date(client.next_renewal_date).toLocaleDateString('en-ZW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (days === null) return dateStr;
  if (days < 0) return `${dateStr} (overdue)`;
  if (days === 0) return `${dateStr} (today)`;
  return `${dateStr} (${days}d)`;
}

const MAILCOW_HOST = import.meta.env.VITE_MAILCOW_HOST ?? 'mail.zeemail.co.zw';

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: 'rgba(255,255,255,0.05)',
  padding: '0.1rem 0.3rem',
  borderRadius: '4px',
  color: 'var(--text-cream)',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 600,
};

export function PortalDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [dkimKey, setDkimKey] = useState<string | null>(null);
  const [fetchingDkim, setFetchingDkim] = useState(false);

  async function handleVerifyDns() {
    if (!client?.id) return;
    try {
      setLoading(true);
      const res = await apiRequest<{ status: string }>('POST', `/api/clients/${client.id}/verify-dns`);
      toast(`DNS verified. New status: ${res.status}`, 'success');
      const { data } = await supabase.from('clients').select('*').eq('id', client.id).single();
      if (data) setClient(data as Client);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'DNS verification failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchDkim() {
    if (!client?.id) return;
    try {
      setFetchingDkim(true);
      const res = await apiRequest<{ dkim_txt: string }>('GET', `/api/clients/${client.id}/dkim`);
      setDkimKey(res.dkim_txt);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to fetch DKIM', 'error');
    } finally {
      setFetchingDkim(false);
    }
  }

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('profile_id', profile!.id)
          .single();

        if (cancelled || !clientData) return;
        setClient(clientData);

        const [mbRes, tkRes, invRes] = await Promise.all([
          supabase.from('mailboxes').select('*').eq('client_id', clientData.id),
          supabase.from('support_tickets').select('*').eq('client_id', clientData.id),
          supabase.from('invoices').select('id').eq('client_id', clientData.id).in('status', ['unpaid', 'overdue']),
        ]);

        if (!cancelled) {
          setMailboxes(mbRes.data ?? []);
          setTickets(tkRes.data ?? []);
          setUnpaidInvoices(invRes.data?.length ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const activeMailboxCount = mailboxes.filter((m) => m.status === 'active').length;
  const totalStorageMb = mailboxes.reduce((sum, m) => sum + (m.quota_mb ?? 0), 0);
  const openTicketCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {loading ? (
          <SkeletonLoader width="260px" height="2rem" borderRadius="8px" />
        ) : (
          <h1
            style={{
              color: 'var(--ink)',
              fontSize: '1.75rem',
              fontWeight: 800,
              margin: 0,
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.025em'
            }}
          >
            Welcome, {client?.company_name ?? profile?.full_name ?? 'Client'}
          </h1>
        )}
        <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0', fontSize: '1rem', fontWeight: 500 }}>
          Manage your enterprise email infrastructure through ZeeMail Mission Control.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {unpaidInvoices > 0 && client?.status !== 'pending_payment' && (
          <div
            style={{
              background: 'var(--cream-3)',
              border: '1px solid #F59E0B',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💳</span>
              <div>
                <h3 style={{ color: 'var(--ink)', margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                  You have {unpaidInvoices === 1 ? 'an unpaid invoice' : `${unpaidInvoices} unpaid invoices`}
                </h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.925rem' }}>
                  Please settle your account balance to avoid service interruption.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/portal/invoices')}
              className="btn btn-primary"
            >
              View Invoices
            </button>
          </div>
        )}

        {client?.status === 'pending_payment' && (
          <div
            style={{
              background: 'var(--cream-2)',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <h3 style={{ color: 'var(--ink)', margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                Action Required: Payment Needed
              </h3>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.925rem', lineHeight: 1.6 }}>
                Your account is pending activation. Complete your initial payment to unlock your <strong>{client?.plan}</strong> plan features.
              </p>
            </div>
            <button
              onClick={() => navigate('/portal/invoices')}
              className="btn btn-primary"
            >
              Go to Invoices
            </button>
          </div>
        )}

        {client?.status === 'pending_dns' && (
          <div
            style={{
              background: 'var(--cream-3)',
              border: '1px solid var(--border-strong)',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ color: 'var(--ink)', margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                  Action Required: Configure DNS Records
                </h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.925rem', lineHeight: 1.6, maxWidth: '600px' }}>
                  Your mailboxes are ready! To start receiving email, you must complete <strong>one</strong> of the two setup options below.
                </p>
              </div>
              <button
                onClick={() => navigate('/register', { state: { resumeDns: true, clientId: client.id, domain: client.domain } })}
                className="btn btn-primary"
              >
                Verify Configuration
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Option 1 */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ color: '#1e40af', margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                  Option 1: Recommended (Full Setup)
                </h4>
                <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Update your domain's Name Servers (e.g. on WebZim) to point to our Cloudflare network. We'll handle everything automatically.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <code style={{ ...codeStyle, background: 'white', color: 'var(--ink)', border: '1px solid var(--border)' }}>Primary: magali.ns.cloudflare.com</code>
                  <code style={{ ...codeStyle, background: 'white', color: 'var(--ink)', border: '1px solid var(--border)' }}>Secondary: yichun.ns.cloudflare.com</code>
                </div>
              </div>

              {/* Option 2 */}
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ color: 'var(--ink)', margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                  Option 2: Manual Setup (Advanced)
                </h4>
                <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  If you prefer to manage your own DNS, copy these exact records to your DNS provider.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>MX Record (Priority 10)</span>
                    <code style={{ ...codeStyle, background: 'var(--cream)', color: 'var(--primary)', border: '1px solid var(--border)', display: 'block', marginTop: '0.25rem' }}>
                      {MAILCOW_HOST}
                    </code>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>SPF Record (TXT)</span>
                    <code style={{ ...codeStyle, background: 'var(--cream)', color: 'var(--primary)', border: '1px solid var(--border)', display: 'block', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                      v=spf1 mx a:{MAILCOW_HOST} ~all
                    </code>
                  </div>
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
              Note: DNS records can take up to 24–48 hours to propagate globally.
            </p>
          </div>
        )}

      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {loading ? (
          <>
            <SkeletonLoader height="7rem" borderRadius="12px" />
            <SkeletonLoader height="7rem" borderRadius="12px" />
            <SkeletonLoader height="7rem" borderRadius="12px" />
            <SkeletonLoader height="7rem" borderRadius="12px" />
          </>
        ) : (
          <>
            <MetricCard label="Active Mailboxes" value={activeMailboxCount} />
            <MetricCard label="Storage Capacity" value={formatStorage(totalStorageMb)} />
            <MetricCard label="Next Renewal" value={renewalLabel(client)} />
            <MetricCard label="Support Tickets" value={openTicketCount} />
          </>
        )}
      </div>

      {!loading && client && client.status !== 'pending_payment' && (
        <div
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              DNS Health Monitor
            </h3>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', fontFamily: 'monospace' }}>{client.domain}</span>
          </div>
          
          <div style={{ padding: '1.25rem', background: client.dns_status === 'healthy' ? 'rgba(134, 239, 172, 0.1)' : 'rgba(252, 165, 165, 0.08)', borderRadius: '12px', border: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>{client.dns_status === 'healthy' ? '✅' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--ink)', fontWeight: 700, margin: '0 0 0.125rem', fontSize: '1.05rem' }}>
                      {client.dns_status === 'healthy' ? 'All records passing' : 'DNS Issues Detected'}
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>
                      Last checked: {client.dns_last_checked ? new Date(client.dns_last_checked).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <button style={btnGhost} onClick={handleVerifyDns}>
                     Re-check Fast
                  </button>
              </div>

             {client.dns_check_results && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.entries(client.dns_check_results).map(([record, passed]) => (
                  <div key={record} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'white', padding: '0.875rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '1.25rem' }}>{passed ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.925rem' }}>{record}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginLeft: 'auto', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{passed ? 'found' : 'missing'}</span>
                  </div>
                ))}
              </div>
            )}
            {client.dns_status !== 'healthy' && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <p style={{ margin: '0 0 1rem', fontWeight: 700, color: 'var(--ink)' }}>Required Records for Manual Setup</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>MX:</span>
                      <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.5rem', borderRadius: '6px', color: 'var(--primary)' }}>{MAILCOW_HOST} (Priority 10)</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>SPF:</span>
                      <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.5rem', borderRadius: '6px', color: 'var(--primary)', wordBreak: 'break-all' }}>v=spf1 mx a:{MAILCOW_HOST} ~all</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>DMARC:</span>
                      <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.5rem', borderRadius: '6px', color: 'var(--primary)', wordBreak: 'break-all' }}>v=DMARC1; p=none; rua=mailto:postmaster@{client.domain}</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>DKIM:</span>
                      {dkimKey ? (
                        <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.5rem', borderRadius: '6px', color: 'var(--primary)', wordBreak: 'break-all' }}>{dkimKey}</code>
                      ) : (
                        <button 
                          onClick={handleFetchDkim} 
                          disabled={fetchingDkim}
                          style={{
                            background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
                            color: 'var(--ink)', padding: '0.25rem 0.5rem', cursor: fetchingDkim ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem', width: 'fit-content'
                          }}
                        >
                          {fetchingDkim ? 'Decrypting...' : 'Reveal DKIM Key'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button style={btnGhost} onClick={() => {
                    const txt = `MX: ${MAILCOW_HOST} (Priority 10)\nSPF: v=spf1 mx a:${MAILCOW_HOST} ~all\nDMARC: v=DMARC1; p=none; rua=mailto:postmaster@${client.domain}` + (dkimKey ? `\nDKIM: ${dkimKey}` : '');
                    navigator.clipboard.writeText(txt);
                    toast('Records copied to clipboard!', 'success');
                  }}>
                    Copy records to clipboard
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ color: 'var(--ink)', fontSize: '1.25rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
          Quick Access Hub
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'Infrastructure & Mail',
              desc: 'Create, edit, and monitor your enterprise mailboxes.',
              path: '/portal/mailboxes',
            },
            {
              title: 'Billing & Subscriptions',
              desc: 'Manage your payment methods and settlement history.',
              path: '/portal/invoices',
            },
            {
              title: 'Concierge Support',
              desc: 'Access our dedicated technical assistance team.',
              path: '/portal/support',
            }
          ].map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>{action.title}</span>
              <p style={{ color: 'var(--muted)', fontSize: '0.925rem', lineHeight: '1.6', margin: 0 }}>{action.desc}</p>
              <div style={{ marginTop: '0.5rem', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Manage Now <span style={{ fontSize: '1rem' }}>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
