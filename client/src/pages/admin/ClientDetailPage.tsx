import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { useMailboxes } from '../../hooks/useMailboxes';
import { useInvoices } from '../../hooks/useInvoices';
import { useToast } from '../../hooks/useToast';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PlanBadge } from '../../components/shared/PlanBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Client, Mailbox, Invoice, SupportTicket, Plan, TicketStatus } from '../../types/index';
const PLAN_MRR: Record<Plan, number> = { starter: 5, business: 12, pro: 25 };

const MAILCOW_HOST = import.meta.env.VITE_MAILCOW_HOST ?? 'mail.zeemail.co.zw';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-low)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--on-background)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--on-background)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
};

const btnDanger: React.CSSProperties = {
  background: 'transparent',
  color: '#F87171',
  border: '1px solid #F87171',
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
};

// ── Overview Tab ──────────────────────────────────────────────────────────────

function PortalAccountCard({ profileId }: { profileId: string | null }) {
  const { toast } = useToast();
  const [account, setAccount] = useState<{ email: string; last_sign_in: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    async function fetchAccount() {
      setLoading(true);
      try {
        const res = await apiRequest<{ email: string; last_sign_in: string | null }>('GET', `/api/auth/users/${profileId}`);
        setAccount(res);
      } catch (err: any) {
        console.error('Failed to fetch portal account:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, [profileId]);

  async function handleResetPassword() {
    if (!profileId) return;
    const newPwd = window.prompt('Enter new portal password (min 8 characters):');
    if (!newPwd) return;
    if (newPwd.length < 8) {
      toast('Password too short', 'error');
      return;
    }

    try {
      await apiRequest('POST', `/api/auth/reset-password/${profileId}`, { password: newPwd });
      toast('Portal password reset successfully', 'success');
    } catch (err: any) {
      toast(err.error || 'Failed to reset password', 'error');
    }
  }

  if (!profileId) return null;

  return (
    <div style={cardStyle}>
      <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Portal Account & Access</h3>
      {loading ? (
        <SkeletonLoader height="40px" borderRadius="6px" />
      ) : account ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0 0 0.25rem' }}>Login Email</p>
            <p style={{ color: 'var(--on-background)', fontWeight: 600, margin: 0 }}>{account.email}</p>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Last activity: {account.last_sign_in ? new Date(account.last_sign_in).toLocaleString() : 'Never'}
            </p>
          </div>
          <button style={btnGhost} onClick={handleResetPassword}>
            Reset Portal Password
          </button>
        </div>
      ) : (
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Account details unavailable.</p>
      )}
    </div>
  );
}

interface OverviewTabProps {
  client: Client;
  onClientUpdated: (c: Client) => void;
  provisioned: boolean | null;
  provisioning: boolean;
  onProvision: () => void;
}

function OverviewTab({ 
  client, 
  onClientUpdated, 
  provisioned, 
  provisioning, 
  onProvision 
}: OverviewTabProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company_name: client.company_name,
    domain: client.domain,
    plan: client.plan as Plan,
    notes: client.notes ?? '',
    next_renewal_date: client.next_renewal_date ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [dkimKey, setDkimKey] = useState<string | null>(null);
  const [fetchingDkim, setFetchingDkim] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          company_name: form.company_name,
          domain: form.domain,
          plan: form.plan,
          notes: form.notes || null,
          next_renewal_date: form.next_renewal_date || null,
        })
        .eq('id', client.id)
        .select('*')
        .single();
      if (error) throw error;
      onClientUpdated(data as Client);
      setEditing(false);
      toast('Client updated', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update client', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyDns() {
    try {
      const res = await apiRequest<{ status: string }>('POST', `/api/clients/${client.id}/verify-dns`);
      toast(`DNS verified. New status: ${res.status}`, 'success');
      // Refresh client data
      const { data } = await supabase.from('clients').select('*').eq('id', client.id).single();
      if (data) onClientUpdated(data as Client);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'DNS verification failed', 'error');
    }
  }

  async function handleToggleStatus() {
    const newStatus = client.status === 'active' ? 'suspended' : 'active';
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', client.id)
        .select('*')
        .single();
      if (error) throw error;
      onClientUpdated(data as Client);
      toast(`Client ${newStatus}`, 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  }

  async function handleAutoFixDns() {
    try {
      const res = await apiRequest<{ newStatus: any }>('POST', `/api/clients/${client.id}/dns/autofix`);
      toast(`DNS Auto-fix complete!`, 'success');
      // Refresh client data
      const { data } = await supabase.from('clients').select('*').eq('id', client.id).single();
      if (data) onClientUpdated(data as Client);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'DNS Auto-fix failed', 'error');
    }
  }

  async function handleFetchDkim() {
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

  const mrr = client.status === 'active' ? PLAN_MRR[client.plan] : 0;

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--on-background)', margin: 0 }}>Client info</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editing ? (
              <>
                <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button style={btnGhost} onClick={() => setEditing(false)}>Cancel</button>
              </>
            ) : (
              <button style={btnGhost} onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Company name" editing={editing}
            value={form.company_name}
            onChange={(v) => setForm((f) => ({ ...f, company_name: v }))}
            staticValue={client.company_name} />
          <Field label="Domain" editing={editing}
            value={form.domain}
            onChange={(v) => setForm((f) => ({ ...f, domain: v }))}
            staticValue={<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{client.domain}</span>} />
          <div>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Plan</label>
            {editing ? (
              <select
                style={inputStyle}
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as Plan }))}
              >
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="pro">Pro</option>
              </select>
            ) : (
              <PlanBadge plan={client.plan} />
            )}
          </div>
          <div>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Status</label>
            <StatusBadge status={client.status} />
          </div>
          <Field label="Next renewal" editing={editing}
            value={form.next_renewal_date}
            onChange={(v) => setForm((f) => ({ ...f, next_renewal_date: v }))}
            staticValue={client.next_renewal_date ? new Date(client.next_renewal_date).toLocaleDateString() : '—'}
            type="date" />
          <div>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>MRR contribution</label>
            <span style={{ color: 'var(--on-background)', fontWeight: 600 }}>${mrr}/mo</span>
          </div>
        </div>

        {editing && (
          <div style={{ marginTop: '1rem' }}>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        )}
      </div>
      
      {/* Portal Account card */}
      <PortalAccountCard profileId={client.profile_id} />

      <div style={cardStyle}>

        <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Provisioning Control</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: client.dns_status === 'healthy' ? 'rgba(134, 239, 172, 0.1)' : 'rgba(252, 165, 165, 0.1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>DNS Health Monitor</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{client.dns_status === 'healthy' ? '✅' : '⚠️'}</span>
                  <div>
                    <p style={{ color: 'var(--on-background)', fontWeight: 700, margin: 0 }}>
                      {client.dns_status === 'healthy' ? 'All records passing' : 'DNS Issues Detected'}
                    </p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: 0 }}>
                      Last checked: {client.dns_last_checked ? new Date(client.dns_last_checked).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
              <button style={btnGhost} onClick={handleVerifyDns}>
                Re-check Fast
              </button>
            </div>

            {client.dns_check_results && typeof client.dns_check_results === 'object' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {Object.entries(client.dns_check_results as Record<string, boolean>).map(([record, passed]) => (
                  <div key={record} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>{passed ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--on-background)', fontWeight: 500, fontSize: '0.875rem' }}>{record} record</span>
                    <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginLeft: 'auto' }}>{passed ? 'found' : 'missing'}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                
                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: 'var(--on-background)' }}>Required Records for Manual Setup</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>MX:</span>
                      <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)' }}>{MAILCOW_HOST} (Priority 10)</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>SPF:</span>
                      <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', wordBreak: 'break-all' }}>v=spf1 mx a:{MAILCOW_HOST} ~all</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>DMARC:</span>
                      <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', wordBreak: 'break-all' }}>v=DMARC1; p=none; rua=mailto:postmaster@{client.domain}</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>DKIM:</span>
                      {dkimKey ? (
                        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', wordBreak: 'break-all' }}>{dkimKey}</code>
                      ) : (
                        <button 
                          onClick={handleFetchDkim} 
                          disabled={fetchingDkim}
                          style={{
                            background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px',
                            color: 'var(--on-background)', padding: '0.25rem 0.5rem', cursor: fetchingDkim ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem', width: 'fit-content'
                          }}
                        >
                          {fetchingDkim ? 'Fetching via Mailcow...' : 'Fetch DKIM Key'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {client.cloudflare_zone_id ? (
                    <button style={{ ...btnPrimary, background: '#10B981' }} onClick={handleAutoFixDns}>
                      Auto-fix via Cloudflare
                    </button>
                  ) : (
                    <button style={btnGhost} onClick={() => alert('Option not automated. Send WhatsApp instructions.')}>
                      Send instructions to client via WhatsApp
                    </button>
                  )}
                  <button style={btnGhost} onClick={() => {
                    const txt = `MX: ${MAILCOW_HOST} (Priority 10)\nSPF: v=spf1 mx a:${MAILCOW_HOST} ~all\nDMARC: v=DMARC1; p=none; rua=mailto:postmaster@${client.domain}` + (dkimKey ? `\nDKIM: ${dkimKey}` : '');
                    navigator.clipboard.writeText(txt);
                    toast('Records copied to clipboard!', 'success');
                  }}>
                    Copy records to clipboard
                  </button>
                </div>
              </div>



          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--on-background)', margin: '0 0 0.25rem', fontWeight: 600 }}>
                Account status: <StatusBadge status={client.status} />
              </p>
              <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.875rem' }}>
                {client.status === 'active' ? 'Client is active and can access services.' : 'Client is currently restricted.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {provisioned === false && (
                <button 
                  style={{ ...btnPrimary, background: '#f59e0b', color: '#000000' }} 
                  onClick={onProvision}
                  disabled={provisioning}
                >
                  {provisioning ? 'Provisioning...' : 'Provision Client'}
                </button>
              )}
              {client.status === 'provisioning_error' && (
                <button style={{ ...btnPrimary, background: '#f59e0b', color: '#000000' }} onClick={handleVerifyDns}>
                  Retry Verification
                </button>
              )}
              <button
                style={client.status === 'active' ? btnDanger : btnPrimary}
                onClick={handleToggleStatus}
              >
                {client.status === 'active' ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {client.name_servers && client.name_servers.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
            ZISPA Name Servers Template
          </h3>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Use the following details when registering or updating the .co.zw domain with ZISPA.
          </p>
          <div style={{ background: '#0a0000', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <code style={{ color: '#86efac', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
              Primary Name Server Name....: {client.name_servers[0] || ''}{'\n'}
              Secondary Name Server Name..: {client.name_servers[1] || ''}{'\n'}
              {client.name_servers.length > 2 && `Tertiary Name Server Name...: ${client.name_servers[2]}\n`}
              {client.name_servers.length > 3 && `Quaternary Name Server Name.: ${client.name_servers[3]}\n`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  staticValue: React.ReactNode;
  type?: string;
}

function Field({ label, editing, value, onChange, staticValue, type = 'text' }: FieldProps) {
  return (
    <div>
      <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      {editing ? (
        <input style={inputStyle} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <span style={{ color: 'var(--on-background)', fontSize: '0.875rem' }}>{staticValue}</span>
      )}
    </div>
  );
}

// ── Mailboxes Tab ─────────────────────────────────────────────────────────────

interface MailboxesTabProps {
  clientId: string;
  clientDomain: string;
}

function MailboxesTab({ clientId, clientDomain }: MailboxesTabProps) {
  const { mailboxes, loading } = useMailboxes(clientId);
  const { toast } = useToast();
  const [localMailboxes, setLocalMailboxes] = useState<Mailbox[]>([]);

  useEffect(() => { setLocalMailboxes(mailboxes); }, [mailboxes]);

  // Add mailbox form state
  const [prefix, setPrefix] = useState('');
  const [quota, setQuota] = useState(500);
  const [password, setPassword] = useState('');
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  async function handleAddMailbox(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!prefix.trim()) errors.prefix = 'Email prefix is required';
    if (!password.trim()) errors.password = 'Password is required';
    if (Object.keys(errors).length) { setAddErrors(errors); return; }
    setAddErrors({});
    setAdding(true);
    const email = `${prefix.trim()}@${clientDomain}`;
    try {
      await apiRequest('POST', '/api/mailboxes/add', {
        local_part: prefix.trim(),
        domain: clientDomain,
        password,
        quota,
        client_id: clientId,
      });
      const { data } = await supabase.from('mailboxes').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      setLocalMailboxes(data ?? []);
      setPrefix(''); setPassword(''); setQuota(500);
      toast('Mailbox added', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to add mailbox', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleResetPassword(email: string) {
    const pwd = window.prompt(`New password for ${email}:`);
    if (!pwd) return;
    try {
      await apiRequest('POST', `/api/mailboxes/${encodeURIComponent(email)}/password`, { password: pwd });
      toast('Password reset', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to reset password', 'error');
    }
  }

  async function handleSuspend(mailbox: Mailbox) {
    const newStatus = mailbox.status === 'active' ? 'suspended' : 'active';
    try {
      await apiRequest('PUT', `/api/mailboxes/${encodeURIComponent(mailbox.email)}`, { active: newStatus === 'active' });
      await supabase.from('mailboxes').update({ status: newStatus }).eq('id', mailbox.id);
      setLocalMailboxes((prev) => prev.map((m) => m.id === mailbox.id ? { ...m, status: newStatus } : m));
      toast(`Mailbox ${newStatus}`, 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update mailbox', 'error');
    }
  }

  async function handleDelete(mailbox: Mailbox) {
    if (!window.confirm(`Delete ${mailbox.email}?`)) return;
    try {
      await apiRequest('DELETE', `/api/mailboxes/${encodeURIComponent(mailbox.email)}`);
      await supabase.from('mailboxes').delete().eq('id', mailbox.id);
      setLocalMailboxes((prev) => prev.filter((m) => m.id !== mailbox.id));
      toast('Mailbox deleted', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete mailbox', 'error');
    }
  }

  return (
    <div>
      {/* Add mailbox form */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--on-background)', margin: 0 }}>Add mailbox</h3>
          <button
            type="button"
            onClick={async () => {
              try {
                await apiRequest('POST', '/api/mailboxes/add-domain', { domain: clientDomain });
                toast(`Domain ${clientDomain} added to Mailcow`, 'success');
              } catch (err: unknown) {
                toast(err instanceof Error ? err.message : 'Failed to add domain', 'error');
              }
            }}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--on-surface-variant)', padding: '0.375rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Add domain to Mailcow
          </button>
        </div>
        <form onSubmit={handleAddMailbox}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                Email prefix
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input style={{ ...inputStyle, flex: 1 }} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="user" />
                <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>@{clientDomain}</span>
              </div>
              {addErrors.prefix && <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>{addErrors.prefix}</span>}
            </div>
            <div>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Password</label>
              <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {addErrors.password && <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>{addErrors.password}</span>}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
              Quota: {quota} MB
            </label>
            <input type="range" min={100} max={2048} step={100} value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
              <span>100 MB</span><span>2 GB</span>
            </div>
          </div>
          <button style={btnPrimary} type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Add mailbox'}
          </button>
        </form>
      </div>

      {/* Mailbox table */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem' }}>Mailboxes</h3>
        {loading ? (
          <SkeletonLoader height="120px" borderRadius="6px" />
        ) : localMailboxes.length === 0 ? (
          <EmptyState heading="No mailboxes" subtext="Add a mailbox above." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Email', 'Quota (MB)', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)', textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localMailboxes.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(62,7,3,0.4)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--on-background)', fontFamily: 'JetBrains Mono, monospace' }}>{m.email}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--on-background)' }}>{m.quota_mb}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}><StatusBadge status={m.status} /></td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={btnGhost} onClick={() => handleResetPassword(m.email)}>Reset pwd</button>
                      <button style={btnGhost} onClick={() => handleSuspend(m)}>
                        {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button style={btnDanger} onClick={() => handleDelete(m)}>Delete</button>
                    </div>
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

// ── Invoices Tab ──────────────────────────────────────────────────────────────

// Pure function: apply "mark paid" logic to an invoice record
function applyMarkPaid(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: 'paid',
    paid_at: new Date().toISOString(),
  };
}

interface InvoicesTabProps {
  clientId: string;
}

function InvoicesTab({ clientId }: InvoicesTabProps) {
  const { invoices, loading } = useInvoices(clientId);
  const { toast } = useToast();
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([]);

  useEffect(() => { setLocalInvoices(invoices); }, [invoices]);

  // Create invoice form
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!amount.trim() || isNaN(Number(amount))) errors.amount = 'Valid amount is required';
    if (!dueDate) errors.dueDate = 'Due date is required';
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }
    setCreateErrors({});
    setCreating(true);
    try {
      const { data, error } = await supabase.from('invoices').insert({
        client_id: clientId,
        amount: Number(amount),
        status: 'unpaid',
        due_date: dueDate,
        description: description || null,
      }).select('*').single();
      if (error) throw error;
      setLocalInvoices((prev) => [data as Invoice, ...prev]);
      setAmount(''); setDescription(''); setDueDate('');
      toast('Invoice created', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create invoice', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleMarkPaid(invoice: Invoice) {
    const updated = applyMarkPaid(invoice);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: updated.paid_at })
        .eq('id', invoice.id);
      if (error) throw error;
      setLocalInvoices((prev) => prev.map((i) => i.id === invoice.id ? updated : i));
      toast('Invoice marked as paid', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update invoice', 'error');
    }
  }

  function handleDownloadPdf(invoice: Invoice) {
    const content = [
      `INVOICE`,
      `ID: ${invoice.id}`,
      `Amount: $${invoice.amount}`,
      `Status: ${invoice.status}`,
      `Due: ${new Date(invoice.due_date).toLocaleDateString()}`,
      invoice.description ? `Description: ${invoice.description}` : '',
      invoice.paid_at ? `Paid at: ${new Date(invoice.paid_at).toLocaleDateString()}` : '',
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Create invoice form */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem' }}>Create invoice</h3>
        <form onSubmit={handleCreateInvoice}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Amount ($)</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {createErrors.amount && <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>{createErrors.amount}</span>}
            </div>
            <div>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Due date</label>
              <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              {createErrors.dueDate && <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>{createErrors.dueDate}</span>}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Description (optional)</label>
            <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button style={btnPrimary} type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create invoice'}
          </button>
        </form>
      </div>

      {/* Invoice table */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem' }}>Invoices</h3>
        {loading ? (
          <SkeletonLoader height="120px" borderRadius="6px" />
        ) : localInvoices.length === 0 ? (
          <EmptyState heading="No invoices" subtext="Create an invoice above." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'Amount', 'Status', 'Due date', 'Actions'].map((h) => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)', textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  data-testid="invoice-row"
                  style={{
                    borderBottom: '1px solid rgba(62,7,3,0.4)',
                    color: inv.status === 'overdue' ? '#F87171' : 'var(--on-background)',
                  }}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>{inv.description ?? '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>${inv.amount}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {inv.status !== 'paid' && (
                        <button style={btnPrimary} onClick={() => handleMarkPaid(inv)}>Mark paid</button>
                      )}
                      <button style={btnGhost} onClick={() => handleDownloadPdf(inv)}>Download PDF</button>
                    </div>
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

// ── Support Tickets Tab ───────────────────────────────────────────────────────

interface TicketsTabProps {
  clientId: string;
}

function TicketsTab({ clientId }: TicketsTabProps) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function fetchTickets() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setTickets(data ?? []);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Failed to load tickets', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTickets();
    return () => { cancelled = true; };
  }, [clientId, toast]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleStatusChange(ticket: SupportTicket, newStatus: TicketStatus) {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);
      if (error) throw error;
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: newStatus } : t));
      toast('Ticket status updated', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update ticket', 'error');
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ color: 'var(--on-background)', margin: '0 0 1rem' }}>Support tickets</h3>
      {loading ? (
        <SkeletonLoader height="120px" borderRadius="6px" />
      ) : tickets.length === 0 ? (
        <EmptyState heading="No tickets" subtext="No support tickets for this client." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map((t) => (
            <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', cursor: 'pointer', background: 'rgba(255,240,196,0.02)',
                }}
                onClick={() => toggleExpand(t.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: expanded.has(t.id) ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                    {expanded.has(t.id) ? '▼' : '▶'}
                  </span>
                  <span style={{ color: 'var(--on-background)', fontWeight: 500, fontSize: '0.875rem' }}>{t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <select
                    style={{ ...inputStyle, width: 'auto', padding: '0.25rem 0.5rem' }}
                    value={t.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(t, e.target.value as TicketStatus)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              {expanded.has(t.id) && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                  <p style={{ color: 'var(--on-background)', margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{t.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'mailboxes' | 'invoices' | 'tickets';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'mailboxes', label: 'Mailboxes' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'tickets', label: 'Support Tickets' },
];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [provisioned, setProvisioned] = useState<boolean | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchClient() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!cancelled) setClient(data as Client);

        // Check provisioning status
        const status = await apiRequest<{ provisioned: boolean }>('GET', `/api/clients/${id}/provision-status`);
        if (!cancelled) setProvisioned(status.provisioned);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Failed to load client', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClient();
    return () => { cancelled = true; };
  }, [id, toast]);

  async function handleProvision() {
    if (!id) return;
    const confirm = window.confirm('This will create the domain in Mailcow and set up default mailboxes. Continue?');
    if (!confirm) return;

    setProvisioning(true);
    try {
      await apiRequest('POST', `/api/clients/${id}/provision`);
      toast('Provisioning successful!', 'success');
      setProvisioned(true);
      // Refresh client data
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
      if (!error && data) setClient(data as Client);
    } catch (err: any) {
      toast(err.error || 'Provisioning failed', 'error');
    } finally {
      setProvisioning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <SkeletonLoader height="40px" borderRadius="6px" />
        <div style={{ marginTop: '1rem' }}>
          <SkeletonLoader height="200px" borderRadius="10px" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <EmptyState heading="Client not found" subtext="This client does not exist or was deleted." />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ color: 'var(--on-background)', margin: 0 }}>{client.company_name}</h1>
          <PlanBadge plan={client.plan} />
          <StatusBadge status={client.status} />
        </div>
        <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem' }}>
          {client.domain}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--on-background)' : 'var(--on-surface-variant)',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          client={client} 
          onClientUpdated={setClient} 
          provisioned={provisioned}
          provisioning={provisioning}
          onProvision={handleProvision}
        />
      )}
      {activeTab === 'mailboxes' && (
        <MailboxesTab clientId={client.id} clientDomain={client.domain} />
      )}
      {activeTab === 'invoices' && (
        <InvoicesTab clientId={client.id} />
      )}
      {activeTab === 'tickets' && (
        <TicketsTab clientId={client.id} />
      )}
    </div>
  );
}
