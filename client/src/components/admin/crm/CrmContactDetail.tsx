import { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import type { CrmContact } from '../../../pages/admin/crm/CrmContactsPage';

interface Interaction {
  id: string;
  type: string;
  notes: string | null;
  created_at: string;
}

const STAGES = ['new', 'contacted', 'negotiating', 'won', 'lost'];
const INTERACTION_TYPES = ['whatsapp', 'call', 'email', 'meeting', 'note'];

interface Props {
  contact: CrmContact;
  onUpdate: (c: CrmContact) => void;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--on-background)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
};

export function CrmContactDetail({ contact, onUpdate, onClose }: Props) {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [logType, setLogType] = useState('note');
  const [logNotes, setLogNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [stage, setStage] = useState(contact.pipeline_stage);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<Interaction[]>('GET', `/api/crm/contacts/${contact.id}/interactions`)
      .then(setInteractions).catch(() => {});
  }, [contact.id]);

  async function handleStageChange(newStage: string) {
    setStage(newStage);
    setSaving(true);
    try {
      const updated = await apiRequest<CrmContact>('PUT', `/api/crm/contacts/${contact.id}`, { pipeline_stage: newStage });
      onUpdate(updated);
      toast('Stage updated', 'success');
    } catch { toast('Failed to update stage', 'error'); }
    finally { setSaving(false); }
  }

  async function handleLogInteraction() {
    if (!logNotes.trim()) return;
    setLogging(true);
    try {
      const interaction = await apiRequest<Interaction>('POST', `/api/crm/contacts/${contact.id}/interactions`, { type: logType, notes: logNotes });
      setInteractions((prev) => [interaction, ...prev]);
      setLogNotes('');
      toast('Interaction logged', 'success');
    } catch { toast('Failed to log interaction', 'error'); }
    finally { setLogging(false); }
  }

  const waUrl = contact.phone
    ? `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(contact.business_name ?? '')}, `
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem' }}>
      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          ['Business', contact.business_name],
          ['City', contact.city],
          ['Phone', contact.phone],
          ['Email', contact.email],
          ['Website', contact.website],
          ['Industry', contact.industry],
        ].map(([label, val]) => (
          <div key={label as string}>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ color: 'var(--on-background)', margin: 0, fontFamily: label === 'Phone' || label === 'Email' ? 'JetBrains Mono, monospace' : undefined, fontSize: '0.8125rem' }}>{val ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Stage */}
      <div>
        <label style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline stage</label>
        <select value={stage} onChange={(e) => handleStageChange(e.target.value)} disabled={saving} style={{ ...inputStyle, textTransform: 'capitalize' }}>
          {STAGES.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '6px', padding: '0.4rem 0.875rem', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 500 }}>
            WhatsApp
          </a>
        )}
        {(stage === 'negotiating' || stage === 'won') && (
          <button onClick={onClose} style={{ background: 'var(--primary)', color: 'var(--on-background)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
            Convert to client
          </button>
        )}
      </div>

      {/* Log interaction */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>Log interaction</p>
        <select value={logType} onChange={(e) => setLogType(e.target.value)} style={{ ...inputStyle, textTransform: 'capitalize' }}>
          {INTERACTION_TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
        </select>
        <textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} placeholder="Notes…" rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
        <button onClick={handleLogInteraction} disabled={logging || !logNotes.trim()} style={{ background: 'var(--primary)', color: 'var(--on-background)', border: 'none', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', fontWeight: 600, opacity: logging ? 0.7 : 1 }}>
          {logging ? 'Logging…' : 'Log'}
        </button>
      </div>

      {/* Interaction history */}
      {interactions.length > 0 && (
        <div>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {interactions.map((i) => (
              <div key={i.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.625rem 0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{i.type}</span>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>{new Date(i.created_at).toLocaleDateString()}</span>
                </div>
                {i.notes && <p style={{ color: 'var(--on-background)', margin: 0, fontSize: '0.8125rem' }}>{i.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
