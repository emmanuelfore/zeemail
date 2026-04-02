import { useEffect, useState, useMemo } from 'react';
import { Download, MessageCircle, Megaphone } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import type { CrmContact } from './CrmContactsPage';

const TEMPLATE = `Hi {business_name} 👋

We noticed you're using {email_provider} for your business emails.

We help Zimbabwean businesses get professional emails like:
info@{business_name}.co.zw

✅ Connects to Outlook & Gmail
✅ .co.zw domain included
✅ Setup within 24 hours
✅ From just $3/month

Interested? Reply to this message or visit our website.`;

const VARIABLES = ['{business_name}', '{owner_name}', '{city}', '{email_provider}'];

function interpolate(template: string, contact: CrmContact): string {
  return template
    .replace(/{business_name}/g, contact.business_name ?? '')
    .replace(/{owner_name}/g, contact.owner_name ?? '')
    .replace(/{city}/g, contact.city ?? '')
    .replace(/{email_provider}/g, contact.email_provider ?? 'free email');
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--on-background)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
};

export function CrmBlastPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [blasts, setBlasts] = useState<{ id: string; name: string; sent_count: number; status: string; created_at: string; message: string }[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState(TEMPLATE);
  const [filterWarm, setFilterWarm] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [sendMode, setSendMode] = useState<'export' | 'sequential' | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<CrmContact[]>('GET', '/api/crm/contacts').then(setContacts).catch(() => {});
    apiRequest<typeof blasts>('GET', '/api/crm/blasts').then(setBlasts).catch(() => {});
  }, []);

  const recipients = useMemo(() => {
    let list = contacts.filter((c) => c.phone);
    if (filterWarm) list = list.filter((c) => c.email_type === 'unprofessional');
    if (filterCity) list = list.filter((c) => c.city?.toLowerCase().includes(filterCity.toLowerCase()));
    return list;
  }, [contacts, filterWarm, filterCity]);

  function insertVariable(v: string) {
    setMessage((m) => m + v);
  }

  function exportTxt() {
    const lines = recipients.map((c) => `${c.phone} — ${c.business_name}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'blast-contacts.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  async function saveBlast() {
    if (!name.trim()) { toast('Enter a blast name', 'error'); return; }
    setSaving(true);
    try {
      const blast = await apiRequest<{ id: string }>('POST', '/api/crm/blasts', {
        name, message, recipients: recipients.map((c) => c.id), status: 'draft',
      });
      toast('Blast saved', 'success');
      setBlasts((prev) => [{ id: blast.id, name, sent_count: 0, status: 'draft', created_at: new Date().toISOString(), message }, ...prev]);
    } catch { toast('Failed to save blast', 'error'); }
    finally { setSaving(false); }
  }

  const currentContact = sendMode === 'sequential' ? recipients[currentIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Megaphone size={28} color="var(--primary)" />
        <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>WhatsApp Broadcast Hub</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', display: 'block', marginBottom: '0.375rem' }}>Blast name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. March warm leads" style={inputStyle} />
          </div>

          <div>
            <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', display: 'block', marginBottom: '0.375rem' }}>Message template</label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {VARIABLES.map((v) => (
                <button key={v} onClick={() => insertVariable(v)} style={{ background: 'var(--border)', color: 'var(--on-background)', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>{v}</button>
              ))}
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={12} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveBlast} disabled={saving} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
              {saving ? 'Saving…' : 'Save blast'}
            </button>
          </div>
        </div>

        {/* Recipients + send */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface-container-low)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Recipients ({recipients.length})</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--on-background)', fontSize: '0.875rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterWarm} onChange={(e) => setFilterWarm(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
              Warm leads only
            </label>
            <input value={filterCity} onChange={(e) => setFilterCity(e.target.value)} placeholder="Filter by city…" style={{ ...inputStyle, marginBottom: '0.75rem' }} />
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {recipients.slice(0, 50).map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid rgba(62,7,3,0.4)' }}>
                  <span style={{ color: 'var(--on-background)', fontSize: '0.8125rem' }}>{c.business_name}</span>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>{c.phone}</span>
                </div>
              ))}
              {recipients.length > 50 && <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>+{recipients.length - 50} more</p>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={exportTxt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'white', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.625rem', cursor: 'pointer', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>
              <Download size={16} /> Export for WhatsApp Broadcast
            </button>
            <button onClick={() => { setSendMode('sequential'); setCurrentIdx(0); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.625rem', cursor: 'pointer', fontWeight: 600, boxShadow: 'var(--shadow-md)' }}>
              <MessageCircle size={16} /> Open chats one by one
            </button>
          </div>

          {/* Sequential send */}
          {sendMode === 'sequential' && currentContact && (
            <div style={{ background: 'var(--surface-container-low)', border: '1px solid var(--primary)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>{currentIdx + 1} of {recipients.length}</p>
              <p style={{ color: 'var(--on-background)', fontWeight: 700, margin: '0 0 0.25rem' }}>{currentContact.business_name}</p>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', margin: '0 0 0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>{currentContact.phone}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={`https://wa.me/${currentContact.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(interpolate(message, currentContact))}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, recipients.length - 1)), 500)}
                  style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '6px', padding: '0.4rem 0.875rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                  Open WhatsApp
                </a>
                <button onClick={() => setCurrentIdx((i) => Math.min(i + 1, recipients.length - 1))} style={{ background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Skip
                </button>
                <button onClick={() => setSendMode(null)} style={{ background: 'transparent', color: 'var(--on-surface-variant)', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blast history */}
      {blasts.length > 0 && (
        <div>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Blast history</p>
          <div style={{ background: 'var(--surface-container-low)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Date', 'Recipients', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blasts.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(62,7,3,0.5)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--on-background)' }}>{b.name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{b.sent_count}</td>
                    <td style={{ padding: '0.75rem', color: b.status === 'sent' ? '#4ade80' : 'var(--on-surface-variant)', textTransform: 'capitalize' }}>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
