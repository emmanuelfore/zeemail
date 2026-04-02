import React, { useState } from 'react';
import type { Lead, LeadStatus } from '../../types/index';
import { StatusBadge } from '../shared/StatusBadge';
import { PlanBadge } from '../shared/PlanBadge';

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'converted', 'rejected'];

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert: (lead: Lead) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZW', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildWhatsAppUrl(lead: Lead): string {
  const phone = (lead.contact_phone ?? '').replace(/\D/g, '');
  const name = lead.contact_name ?? '';
  const domain = lead.domain ? `${lead.domain}${lead.tld ?? ''}` : '';
  const text = `Hi ${name}, we received your domain registration request for ${domain}. We'd love to help you get set up. When would be a good time to chat?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function LeadsTable({ leads, onStatusChange, onConvert }: LeadsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const thStyle: React.CSSProperties = {
    padding: '0.625rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: 'var(--on-background)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Company</th>
            <th style={thStyle}>Plan</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Submitted</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const fullDomain = lead.domain ? `${lead.domain}${lead.tld ?? ''}` : '—';

            return (
              <React.Fragment key={lead.id}>
                <tr
                  data-testid="lead-row"
                  onClick={() => toggleRow(lead.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#200403' : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#1f0302';
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Domain */}
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem' }}>
                      {fullDomain}
                    </span>
                  </td>

                  {/* Company */}
                  <td style={tdStyle}>{lead.company_name ?? '—'}</td>

                  {/* Plan */}
                  <td style={tdStyle}>
                    {lead.plan ? <PlanBadge plan={lead.plan} /> : <span style={{ color: 'var(--on-surface-variant)' }}>—</span>}
                  </td>

                  {/* Phone */}
                  <td style={tdStyle}>{lead.contact_phone ?? '—'}</td>

                  {/* Status */}
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--on-background)',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <span style={{ marginLeft: '0.5rem' }}>
                      <StatusBadge status={lead.status} />
                    </span>
                  </td>

                  {/* Submitted */}
                  <td style={tdStyle}>{formatDate(lead.created_at)}</td>

                  {/* Actions */}
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* WhatsApp button */}
                      <a
                        data-testid="whatsapp-btn"
                        href={buildWhatsAppUrl(lead)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open WhatsApp"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(37,211,102,0.15)',
                          color: '#25d366',
                          textDecoration: 'none',
                          border: '1px solid rgba(37,211,102,0.3)',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>

                      {/* Convert to client button — only when status = 'contacted' */}
                      {lead.status === 'contacted' && (
                        <button
                          data-testid="convert-btn"
                          onClick={() => onConvert(lead)}
                          title="Convert to client"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '6px',
                            background: 'var(--primary)',
                            color: 'var(--on-background)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Convert
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {isExpanded && (
                  <tr key={`${lead.id}-detail`}>
                    <td
                      colSpan={7}
                      style={{
                        padding: '1rem 1.5rem',
                        background: '#200403',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '0.75rem 1.5rem',
                        }}
                      >
                        <DetailField label="Full domain" value={fullDomain} mono />
                        <DetailField label="Contact name" value={lead.contact_name} />
                        <DetailField label="Contact email" value={lead.contact_email} />
                        <DetailField label="Contact phone" value={lead.contact_phone} />
                        <DetailField label="Position" value={lead.contact_position} />
                        <DetailField label="Registration type" value={lead.registration_type} />
                        <DetailField label="Business reg #" value={lead.business_reg_number} />
                        <DetailField label="Physical address" value={lead.physical_address} />
                        <DetailField label="Org description" value={lead.org_description} />
                        <DetailField label="Letterhead ready" value={lead.letterhead_ready ? 'Yes' : 'No'} />
                        <DetailField label="TC confirmed" value={lead.tc_confirmed ? 'Yes' : 'No'} />
                        <DetailField label="Signed letter ready" value={lead.signed_letter_ready ? 'Yes' : 'No'} />
                        <DetailField label="ID ready" value={lead.id_ready ? 'Yes' : 'No'} />
                        {lead.notes && <DetailField label="Notes" value={lead.notes} />}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '0.8125rem',
          color: value ? 'var(--on-background)' : 'var(--on-surface-variant)',
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  );
}
