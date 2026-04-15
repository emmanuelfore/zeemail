import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Client, Invoice } from '../../types/index';

const SUPPORT_NUMBER = '263771234567';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card, var(--surface-container-low))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '10px',
  padding: '1.25rem',
};

const btnGhost: React.CSSProperties = {
  background: 'white',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.45rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  transition: 'all 0.2s',
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '0.45rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.2s',
};

function buildWhatsAppUrl(invoice: Invoice): string {
  const text = encodeURIComponent(
    `Hi, I'd like to pay invoice ${invoice.id} for $${invoice.amount}`
  );
  return `https://wa.me/${SUPPORT_NUMBER}?text=${text}`;
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function handleDownloadPdf(invoice: Invoice, clientName: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(21, 128, 61); // ZeeMail green theme
  doc.text('ZEEMAIL', 14, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('ZeeMail Enterprise', 14, 35);
  doc.text('contact@zeemail.co.zw', 14, 40);
  
  // Invoice Details
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(`Invoice ID: ${invoice.id.toUpperCase().split('-')[0]}`, 140, 25);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date Issued: ${new Date(invoice.created_at || Date.now()).toLocaleDateString()}`, 140, 32);
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 37);
  
  // Billed To
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('BILLED TO:', 14, 55);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(clientName, 14, 62);
  
  // Table
  autoTable(doc, {
    startY: 75,
    head: [['Description', 'Status', 'Total']],
    body: [
      [
        invoice.description || 'Enterprise Email Service',
        invoice.status.toUpperCase(),
        `$${invoice.amount.toFixed(2)}`
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: [21, 128, 61] },
    margin: { top: 75 },
  });

  // Footer/Total
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`Total Due: $${invoice.amount.toFixed(2)}`, 140, finalY + 15);
  
  if (invoice.status === 'paid') {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(24);
    doc.text('PAID', 140, finalY + 30);
  }

  doc.save(`Invoice_${invoice.id.slice(0, 8)}.pdf`);
}

export function PortalInvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

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
          .single<Client>();

        if (cancelled || !clientData) return;
        setClient(clientData);

        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        if (!cancelled) setInvoices(invoiceData ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [profile?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>
          Invoices
        </h1>
        <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0, fontSize: '0.9rem' }}>
          View and pay your invoices.
        </p>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <SkeletonLoader height="160px" borderRadius="6px" />
        ) : invoices.length === 0 ? (
          <EmptyState
            heading="No invoices"
            subtext="You have no invoices yet. They will appear here once created."
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, var(--border))' }}>
                {['Description', 'Amount', 'Status', 'Due date', 'Actions'].map((h) => (
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
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  data-testid="invoice-row"
                  style={{
                    borderBottom: '1px solid rgba(62,7,3,0.4)',
                    color: inv.status === 'overdue' ? '#F87171' : 'var(--text-cream, var(--on-background))',
                  }}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>{inv.description ?? '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>${inv.amount}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    {new Date(inv.due_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {inv.status !== 'paid' && (
                        <a
                          href={buildWhatsAppUrl(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={btnPrimary}
                          data-testid="pay-now-btn"
                        >
                          Pay now
                        </a>
                      )}
                      <button
                        style={btnGhost}
                        onClick={() => handleDownloadPdf(inv, client?.company_name || profile?.full_name || 'Client')}
                        data-testid="download-pdf-btn"
                      >
                        Download PDF
                      </button>
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
