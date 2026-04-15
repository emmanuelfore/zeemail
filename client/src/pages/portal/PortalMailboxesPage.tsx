import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { useToast } from '../../hooks/useToast';
import { AddMailboxModal } from '../../components/portal/AddMailboxModal';
import { MailboxRow } from '../../components/portal/MailboxRow';
import { apiRequest } from '../../lib/api';
import type { Client, Mailbox, ApiError } from '../../types/index';

const MAILCOW_HOST = import.meta.env.VITE_MAILCOW_HOST || 'mail.zeemail.co.zw';

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '1.5rem',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text-cream)',
  fontSize: '1.125rem',
  fontWeight: 700,
  margin: '0 0 1rem',
};

const label: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 0.25rem',
};

const code: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '0.8125rem',
  color: 'var(--text-cream)',
  padding: '0.25rem 0.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '4px',
  display: 'block',
  width: 'fit-content',
};

function SetupSection({ domain }: { domain: string }) {
  const [tab, setTab] = useState<'outlook' | 'gmail' | 'mobile' | 'thunderbird' | 'generic'>('outlook');

  const tabs = [
    { id: 'outlook' as const, label: 'Outlook' },
    { id: 'gmail' as const, label: 'Gmail (add account)' },
    { id: 'mobile' as const, label: 'iPhone / Android' },
    { id: 'thunderbird' as const, label: 'Thunderbird' },
    { id: 'generic' as const, label: 'Other Clients' },
  ];

  const settings = {
    imap: { host: MAILCOW_HOST, port: 993, security: 'SSL/TLS' },
    smtp: { host: MAILCOW_HOST, port: 587, security: 'STARTTLS' },
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(21, 128, 61, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </div>
        <div>
          <h3 style={{ ...sectionTitle, margin: 0 }}>Connect your mail client</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>How to set up your email on any device.</p>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
        Use the following incoming and outgoing server settings to configure your <strong>{domain}</strong> mailbox in Outlook, Gmail, iPhone, or any other app. Need help? <a href="/portal/support" style={{ color: 'var(--primary)', fontWeight: 600 }}>Contact support</a>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ ...label, color: 'var(--primary)', marginBottom: '0.75rem' }}>Incoming mail (IMAP)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><p style={label}>Server</p><code style={code}>{settings.imap.host}</code></div>
            <div><p style={label}>Port</p><code style={code}>{settings.imap.port}</code></div>
            <div><p style={label}>Security</p><code style={code}>{settings.imap.security}</code></div>
            <div><p style={label}>Username</p><code style={code}>your full email address</code></div>
          </div>
        </div>
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ ...label, color: 'var(--primary)', marginBottom: '0.75rem' }}>Outgoing mail (SMTP)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><p style={label}>Server</p><code style={code}>{settings.smtp.host}</code></div>
            <div><p style={label}>Port</p><code style={code}>{settings.smtp.port}</code></div>
            <div><p style={label}>Security</p><code style={code}>{settings.smtp.security}</code></div>
            <div><p style={label}>Username</p><code style={code}>your full email address</code></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.375rem 0.875rem',
              background: tab === t.id ? 'var(--primary)' : 'var(--bg-card)',
              border: `1px solid ${tab === t.id ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '999px',
              color: 'var(--text-cream)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
        {tab === 'outlook' && (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Open Outlook → <strong style={{ color: 'var(--text-cream)' }}>File → Add Account</strong></li>
            <li>Enter your full email address and click <strong style={{ color: 'var(--text-cream)' }}>Advanced options → Let me set up my account manually</strong></li>
            <li>Select <strong style={{ color: 'var(--text-cream)' }}>IMAP</strong></li>
            <li>Incoming: server <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.imap.host}</code>, port <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>993</code>, SSL/TLS</li>
            <li>Outgoing: server <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code>, port <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>587</code>, STARTTLS</li>
            <li>Username = your full email address, password = your mailbox password</li>
            <li>Click <strong style={{ color: 'var(--text-cream)' }}>Connect</strong></li>
          </ol>
        )}
        {tab === 'gmail' && (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Open Gmail → <strong style={{ color: 'var(--text-cream)' }}>Settings (gear icon) → See all settings → Accounts and Import</strong></li>
            <li>Under "Check mail from other accounts" click <strong style={{ color: 'var(--text-cream)' }}>Add a mail account</strong></li>
            <li>Enter your full email address and click <strong style={{ color: 'var(--text-cream)' }}>Next</strong></li>
            <li>Choose <strong style={{ color: 'var(--text-cream)' }}>Import emails from my other account (POP3)</strong> or use the IMAP settings above in a dedicated email client</li>
            <li>For sending: under "Send mail as" add your address, SMTP server <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code>, port 587, TLS</li>
          </ol>
        )}
        {tab === 'mobile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ ...label, marginBottom: '0.5rem' }}>iPhone (iOS Mail)</p>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <li>Settings → Mail → Accounts → <strong style={{ color: 'var(--text-cream)' }}>Add Account → Other → Add Mail Account</strong></li>
                <li>Enter name, email, password, description</li>
                <li>Select <strong style={{ color: 'var(--text-cream)' }}>IMAP</strong></li>
                <li>Incoming host: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.imap.host}</code> port 993 SSL</li>
                <li>Outgoing host: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code> port 587 STARTTLS</li>
              </ol>
            </div>
            <div>
              <p style={{ ...label, marginBottom: '0.5rem' }}>Android (Gmail app)</p>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <li>Gmail app → Menu → <strong style={{ color: 'var(--text-cream)' }}>Add account → Other</strong></li>
                <li>Enter your email address → <strong style={{ color: 'var(--text-cream)' }}>Manual setup → Personal (IMAP)</strong></li>
                <li>Incoming: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.imap.host}</code> port 993 SSL/TLS</li>
                <li>Outgoing: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code> port 587 STARTTLS</li>
              </ol>
            </div>
          </div>
        )}
        {tab === 'thunderbird' && (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Open Thunderbird → <strong style={{ color: 'var(--text-cream)' }}>File → New → Existing Mail Account</strong></li>
            <li>Enter your name, email address, and password → click <strong style={{ color: 'var(--text-cream)' }}>Configure manually</strong></li>
            <li>Incoming: IMAP, <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.imap.host}</code>, port 993, SSL/TLS, Normal password</li>
            <li>Outgoing: SMTP, <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code>, port 587, STARTTLS, Normal password</li>
            <li>Click <strong style={{ color: 'var(--text-cream)' }}>Done</strong></li>
          </ol>
        )}
        {tab === 'generic' && (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Locate the <strong style={{ color: 'var(--text-cream)' }}>Add Account</strong> or <strong style={{ color: 'var(--text-cream)' }}>Settings</strong> menu in your client.</li>
            <li>Select <strong style={{ color: 'var(--text-cream)' }}>Manual Setup</strong> or <strong style={{ color: 'var(--text-cream)' }}>IMAP</strong>.</li>
            <li><strong>Incoming Server:</strong> <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.imap.host}</code>, Port: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>993</code>, Security: SSL/TLS.</li>
            <li><strong>Outgoing Server:</strong> <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>{settings.smtp.host}</code>, Port: <code style={{ ...code, display: 'inline', padding: '0.1rem 0.4rem' }}>587</code>, Security: STARTTLS.</li>
            <li><strong>Authentication:</strong> Use your <strong style={{ color: 'var(--text-cream)' }}>full email address</strong> as the username for both servers.</li>
            <li>Confirm and finished! your mail will start syncing immediately.</li>
          </ol>
        )}
      </div>
    </div>
  );
}

function DnsRecordsSection({ client }: { client: Client }) {
  const { toast } = useToast();
  const [dkimKey, setDkimKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDkim() {
    setLoading(true);
    try {
      const res = await apiRequest<{ dkim_txt: string }>('GET', `/api/clients/${client.id}/dkim`);
      setDkimKey(res.dkim_txt);
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to fetch DKIM key', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <p style={sectionTitle}>Manual DNS Records</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
        If your domain status is <strong>pending_dns</strong>, please add these records to your DNS provider (e.g. Cloudflare, GoDaddy).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* MX */}
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
          <p style={label}>MX Record</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><p style={{ ...label, fontSize: '0.65rem' }}>Type</p><code style={code}>MX</code></div>
            <div><p style={{ ...label, fontSize: '0.65rem' }}>Value</p><code style={code}>10 {MAILCOW_HOST}</code></div>
          </div>
        </div>

        {/* SPF */}
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
          <p style={label}>SPF Record (TXT)</p>
          <code style={code}>v=spf1 ip4:193.203.184.225 -all</code>
        </div>

        {/* DKIM */}
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={label}>DKIM Record (TXT)</p>
            {!dkimKey && (
              <button 
                onClick={fetchDkim} 
                disabled={loading}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {loading ? 'Fetching...' : 'Show Key'}
              </button>
            )}
          </div>
          {dkimKey ? (
            <code style={{ ...code, wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
              {dkimKey}
            </code>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, fontStyle: 'italic' }}>Click show key to see your DKIM record.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortalMailboxesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMailboxes = useCallback(async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('mailboxes')
        .select('*')
        .eq('client_id', clientId)
        .order('email', { ascending: true });
      if (error) throw error;
      setMailboxes(data ?? []);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to fetch mailboxes', 'error');
    }
  }, [toast]);

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

      await fetchMailboxes(clientData.id);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load mailboxes', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast, fetchMailboxes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleResetPassword(email: string, newPassword: string) {
    try {
      await apiRequest('POST', `/api/mailboxes/${encodeURIComponent(email)}/password`, { password: newPassword });
      toast('Password reset successfully', 'success');
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to reset password', 'error');
      throw err;
    }
  }

  async function handleUpdateQuota(email: string, newQuota: number) {
    try {
      await apiRequest('POST', `/api/mailboxes/${encodeURIComponent(email)}/quota`, { quota: newQuota });
      toast('Quota updated successfully', 'success');
      if (client?.id) {
        await fetchMailboxes(client.id);
      }
    } catch (err: unknown) {
      toast((err as ApiError).error ?? 'Failed to update quota', 'error');
      throw err;
    }
  }

  const isPaid = client?.status === 'active';
  const isPendingPayment = client?.status === 'pending_payment';
  const canAdd = client?.status && client.status !== 'suspended';
  const mailboxLimit = client?.mailbox_limit ?? 0;
  const mailboxCount = mailboxes.length;
  const mailboxSlotsRemaining = Math.max(0, mailboxLimit - mailboxCount);
  const isPlanLimitReached = mailboxCount >= mailboxLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-cream)', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Mailboxes</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
              Manage your email accounts for <strong style={{ color: 'var(--text-cream)' }}>{client?.domain ?? '…'}</strong>
            </p>
            {client?.status && <StatusBadge status={client.status} />}
          </div>
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
              {isPlanLimitReached ? 'Manage Plan' : 'Add Mailbox'}
            </button>
          )}
        </div>
      </div>

      {!loading && client && (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ ...card, flex: 1, minWidth: '200px' }}>
            <p style={label}>Subscription Plan</p>
            <p style={{ color: 'var(--text-cream)', margin: 0, fontWeight: 700, textTransform: 'capitalize' }}>
              {client.plan}
            </p>
          </div>
          <div style={{ ...card, flex: 1, minWidth: '200px' }}>
            <p style={label}>Mailboxes used</p>
            <p style={{ color: 'var(--text-cream)', margin: 0, fontWeight: 700 }}>
              {mailboxCount} / {mailboxLimit}
            </p>
          </div>
          <div style={{ ...card, flex: 1, minWidth: '200px' }}>
            <p style={label}>Slots remaining</p>
            <p style={{ color: mailboxSlotsRemaining > 0 ? 'var(--primary)' : 'var(--danger)', margin: 0, fontWeight: 700 }}>
              {mailboxSlotsRemaining}
            </p>
          </div>
        </div>
      )}

      {isPendingPayment && (
        <div style={{ 
          background: 'rgba(21, 128, 61, 0.05)', 
          border: '1px solid rgba(21, 128, 61, 0.2)', 
          borderRadius: '12px', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Welcome to ZeeMail!</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.925rem', lineHeight: 1.6 }}>
              Your account for <strong>{client?.domain}</strong> is currently being provisioned. You can start setting up up to <strong>{client?.mailbox_limit}</strong> mailboxes now, including choosing each mailbox password. They will be fully activated as soon as your initial payment is confirmed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.href = '/portal/invoices'}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Complete Payment
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height="48px" borderRadius="6px" />)}
          </div>
        ) : mailboxes.length === 0 ? (
          <EmptyState
            heading={isPendingPayment ? "Start your setup" : "No mailboxes yet"}
            subtext={isPendingPayment 
              ? "Add your first mailbox while your account is being activated." 
              : "Your mailboxes will appear here once they have been set up."}
            actionLabel={canAdd && !isPlanLimitReached ? "Add Mailbox" : undefined}
            onAction={canAdd && !isPlanLimitReached ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  {['Email address', 'Storage quota', 'Status', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '0.625rem 1rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mailboxes.map((mailbox) => (
                  <MailboxRow
                    key={mailbox.id}
                    mailbox={mailbox}
                    plan={client.plan}
                    onResetPassword={handleResetPassword}
                    onUpdateQuota={handleUpdateQuota}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && client?.domain && canAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <SetupSection domain={client.domain} />
          <DnsRecordsSection client={client} />
        </div>
      )}

      {isModalOpen && client && (
        <AddMailboxModal 
          clientId={client.id}
          domain={client.domain}
          mailboxLimit={client.mailbox_limit}
          currentCount={mailboxes.length}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchMailboxes(client.id)}
        />
      )}
    </div>
  );
}
