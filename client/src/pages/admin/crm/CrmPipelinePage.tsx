import { useEffect, useState } from 'react';
import { Kanban } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { SlideOver } from '../../../components/shared/SlideOver';
import { CrmContactDetail } from '../../../components/admin/crm/CrmContactDetail';
import type { CrmContact } from './CrmContactsPage';

const STAGES = ['new', 'contacted', 'negotiating', 'won', 'lost'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  new: 'var(--border)',
  contacted: '#660B05',
  negotiating: 'var(--primary)',
  won: 'rgba(74,222,128,0.2)',
  lost: 'rgba(196,145,122,0.1)',
};

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function CrmPipelinePage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<CrmContact[]>('GET', '/api/crm/pipeline')
      .then(setContacts)
      .catch(() => toast('Failed to load pipeline', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const byStage = (stage: Stage) => contacts.filter((c) => c.pipeline_stage === stage);

  async function handleDrop(contactId: string, newStage: Stage) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.pipeline_stage === newStage) return;
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, pipeline_stage: newStage } : c));
    try {
      await apiRequest('PUT', `/api/crm/contacts/${contactId}`, { pipeline_stage: newStage });
    } catch {
      toast('Failed to move contact', 'error');
      setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, pipeline_stage: contact.pipeline_stage } : c));
    }
  }

  const total = contacts.length;
  const warm = contacts.filter((c) => c.email_type === 'unprofessional').length;
  const contacted = byStage('contacted').length;
  const won = byStage('won').length;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Kanban size={28} color="var(--primary)" />
        <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Pipeline</h1>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'var(--surface-container-low)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
        {[
          ['Total', total],
          ['Warm leads', warm],
          ['Contacted', contacted],
          ['Won this month', won],
          [`Conversion`, `${convRate}%`],
        ].map(([label, val]) => (
          <span key={label as string} style={{ color: 'var(--on-surface-variant)' }}>{label}: <strong style={{ color: 'var(--on-background)' }}>{val}</strong></span>
        ))}
      </div>

      {/* Kanban */}
      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', overflowX: 'auto' }}>
          {STAGES.map((stage) => (
            <div key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragging) handleDrop(dragging, stage); setDragging(null); }}
              style={{ background: 'var(--surface-container-low)', border: `1px solid ${STAGE_COLORS[stage]}`, borderRadius: '10px', padding: '0.75rem', minHeight: '300px', minWidth: '180px' }}>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
                {stage} <span style={{ color: 'var(--border)' }}>({byStage(stage).length})</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {byStage(stage).map((c) => (
                  <div key={c.id} draggable
                    onDragStart={() => setDragging(c.id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelected(c)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.625rem', cursor: 'grab', userSelect: 'none' }}>
                    <p style={{ color: 'var(--on-background)', fontWeight: 600, margin: '0 0 0.25rem', fontSize: '0.8125rem' }}>{c.business_name ?? '—'}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: '0 0 0.25rem' }}>{c.city ?? '—'}</p>
                    {c.email_provider && (
                      <span style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', borderRadius: '999px', padding: '1px 6px', fontSize: '0.7rem' }}>{c.email_provider}</span>
                    )}
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.7rem', margin: '0.25rem 0 0' }}>{daysSince(c.created_at)}d in stage</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
