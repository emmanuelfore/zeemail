import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { MailboxRow } from '../../components/portal/MailboxRow';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AddMailboxModal } from '../../components/portal/AddMailboxModal';
import type { Client, Mailbox, ApiError } from '../../types/index';

const MAILCOW_HOST = import.meta.env.VITE_MAILCOW_HOST ?? 'mail.zeemail.co.zw';

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.5rem',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text-cream)',
  fontWeight: 700,
  fontSize: '1rem',
  margin: '0 0 1rem',
};

const label: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

const code: React.CSSProperties = {
  display: 'block',
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--primary)',
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 700,
  fontSize: '0.875rem',
  wordBreak: 'break-all' as const,
};

function SetupSection({ domain }: { domain: string }) {
  const [tab, setTab] = useState<'outlook' | 'gmail' | 'mobile' | 'thunderbird'>('outlook');

  const tabs = [
    { id: 'outlook' as const, label: 'Outlook' },
    { id: 'gmail' as const, label: 'Gmail (add account)' },
    { id: 'mobile' as const, label: 'iPhone / Android' },
    { id: 'thunderbird' as const, label: 'Thunderbird' },
  ];

  const settings = {
    imap: { host: MAILCOW_HOST, port: 993, security: 'SSL/TLS' },
    smtp: { host: MAILCOW_HOST, port: 587, security: 'STARTTLS' },
  };

  return (
    <div style={card}>
      <p style={sectionTitle}>Email client setup instructions</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
        Use these settings to configure any email client with your <strong style={{ color: 'var(--text-cream)' }}>{domain}</strong> mailbox.
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
      </div>
    </div>
  );
}

export function PortalMailboxesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMailboxes = useCallback(async (clientId: string) => {
    const { data: mbData, error: mbError } = await supabase
      .from('mailboxes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (mbError) throw mbError;
    setMailboxes(mbData ?? []);
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

  const isPaid = client?.status === 'active';
  const isPendingPayment = client?.status === 'pending_payment';

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
          {!loading && isPaid && (
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
              Add Mailbox
            </button>
          )}
        </div>
      </div>

      {isPendingPayment && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '12px', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div>
            <h3 style={{ color: 'var(--danger)', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Payment Required</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.925rem', lineHeight: 1.6 }}>
              Your account is currently pending payment. To activate your <strong>{client?.plan}</strong> plan and start creating mailboxes for <strong>{client?.domain}</strong>, please complete your initial payment.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.href = '/portal/invoices'}
              style={{
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Invoices
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
            heading={isPendingPayment ? "Waiting for activation" : "No mailboxes yet"}
            subtext={isPendingPayment 
              ? "Once your payment is confirmed, you'll be able to create your first mailbox." 
              : "Your mailboxes will appear here once they have been set up."}
            actionLabel={isPaid ? "Add Mailbox" : isPendingPayment ? "Finish payment" : undefined}
            onAction={isPaid ? () => setIsModalOpen(true) : () => window.location.href = '/portal/invoices'}
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
                    onResetPassword={handleResetPassword}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && client?.domain && isPaid && <SetupSection domain={client.domain} />}

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
