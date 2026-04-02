import { useState } from 'react';
import { useLeads } from '../../hooks/useLeads';
import { LeadsTable } from '../../components/admin/LeadsTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { SlideOver } from '../../components/shared/SlideOver';
import { AddClientForm } from '../../components/admin/AddClientForm';
import type { Lead, LeadStatus, Plan } from '../../types/index';

export function LeadsPage() {
  const { leads, loading, updateLeadStatus } = useLeads();
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  function handleConvert(lead: Lead) {
    setConvertLead(lead);
  }

  function handleStatusChange(id: string, status: LeadStatus) {
    updateLeadStatus(id, status);
  }

  const initialValues = convertLead
    ? {
        domain: convertLead.domain
          ? `${convertLead.domain}${convertLead.tld ?? ''}`
          : '',
        company_name: convertLead.company_name ?? '',
        plan: (convertLead.plan ?? '') as Plan | '',
        contact_name: convertLead.contact_name ?? '',
        contact_email: convertLead.contact_email ?? '',
        contact_phone: convertLead.contact_phone ?? '',
      }
    : undefined;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              color: 'var(--on-background)',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.25rem',
            }}
          >
            Leads
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
            Domain registration enquiries from the landing page
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          background: 'var(--surface-container-low)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} height="2.5rem" borderRadius="6px" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            heading="No leads yet"
            subtext="Domain registration enquiries submitted via the landing page will appear here."
          />
        ) : (
          <LeadsTable
            leads={leads}
            onStatusChange={handleStatusChange}
            onConvert={handleConvert}
          />
        )}
      </div>

      {/* Convert to client slide-over */}
      <SlideOver
        isOpen={convertLead !== null}
        onClose={() => setConvertLead(null)}
        title="Convert lead to client"
      >
        {convertLead && (
          <AddClientForm
            initialValues={initialValues}
            onSuccess={() => setConvertLead(null)}
          />
        )}
      </SlideOver>
    </div>
  );
}
