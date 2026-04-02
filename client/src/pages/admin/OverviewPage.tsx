import { useState } from 'react';
import {
  Users,
  Mail,
  ReceiptText,
  Banknote,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MetricCard } from '../../components/admin/MetricCard';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { MailcowBanner } from '../../components/shared/MailcowBanner';
import { SlideOver } from '../../components/shared/SlideOver';
import { useClients } from '../../hooks/useClients';
import { useMailboxes } from '../../hooks/useMailboxes';
import { useInvoices } from '../../hooks/useInvoices';
import { AddClientForm } from '../../components/admin/AddClientForm';
import { usePricing } from '../../hooks/useSettings';
import type { Plan } from '../../types/index';

function calcMRR(clients: { plan: Plan; status: string }[], pricing: Record<Plan, number>): number {
  return clients
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (pricing[c.plan] || 0), 0);
}

/** Build last-6-months labels */
function last6Months(): string[] {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString('default', { month: 'short' }));
  }
  return months;
}

const CHART_COLORS = {
  primary: '#8C1007',
  secondary: '#FFF0C4',
  tertiary: '#660B05',
  grid: 'rgba(140, 16, 7, 0.05)',
  axis: 'var(--muted)',
};

export function OverviewPage() {
  const { clients, loading: clientsLoading } = useClients();
  const { mailboxes, loading: mailboxesLoading } = useMailboxes();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { pricing, loading: pricingLoading } = usePricing();

  const [mailcowError] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addMailboxOpen, setAddMailboxOpen] = useState(false);

  const loading = clientsLoading || mailboxesLoading || invoicesLoading || pricingLoading;

  const totalClients = clients.length;
  const totalActiveMailboxes = mailboxes.filter((m) => m.status === 'active').length;
  const mrr = calcMRR(clients, pricing);
  const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid' || i.status === 'overdue').length;

  // Build chart data from clients created_at
  const months = last6Months();
  const now = new Date();
  const clientGrowthData = months.map((month, idx) => {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const count = clients.filter((c) => {
      const d = new Date(c.created_at);
      return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth();
    }).length;
    return { month, clients: count };
  });

  const revenueData = months.map((month, idx) => {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const revenue = invoices
      .filter((inv) => {
        const d = new Date(inv.created_at);
        return (
          inv.status === 'paid' &&
          d.getFullYear() === targetMonth.getFullYear() &&
          d.getMonth() === targetMonth.getMonth()
        );
      })
      .reduce((sum, inv) => sum + Number(inv.amount), 0);
    return { month, revenue };
  });

  // Recent activity: last 10 items from clients + mailboxes sorted by created_at
  const activityItems = [
    ...clients.map((c) => ({
      id: c.id,
      label: `New client: ${c.company_name}`,
      time: c.created_at,
    })),
    ...mailboxes.map((m) => ({
      id: m.id,
      label: `New mailbox: ${m.email}`,
      time: m.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  return (
    <div>
      <MailcowBanner show={mailcowError} />

      <div style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <h1 style={{ color: 'var(--ink)', margin: 0, fontFamily: 'var(--font-heading)' }}>Mission Overview</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setAddClientOpen(true)}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 700,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              Add client
            </button>
            <button
              onClick={() => setAddMailboxOpen(true)}
              style={{
                background: 'white',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              Add mailbox
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {loading ? (
            <>
              <div data-testid="skeleton"><SkeletonLoader height="96px" borderRadius="12px" /></div>
              <div data-testid="skeleton"><SkeletonLoader height="96px" borderRadius="12px" /></div>
              <div data-testid="skeleton"><SkeletonLoader height="96px" borderRadius="12px" /></div>
              <div data-testid="skeleton"><SkeletonLoader height="96px" borderRadius="12px" /></div>
            </>
          ) : (
            <>
              <MetricCard label="Total clients" value={totalClients} icon={<Users size={20} />} />
              <MetricCard label="Active mailboxes" value={totalActiveMailboxes} icon={<Mail size={20} />} />
              <MetricCard label="MRR" value={`$${mrr}`} icon={<Banknote size={20} />} />
              <MetricCard label="Pending settlement" value={unpaidInvoices} icon={<ReceiptText size={20} />} />
            </>
          )}
        </div>

        {/* Charts row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Client growth line chart */}
          <div
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3
              style={{
                color: 'var(--ink)',
                margin: '0 0 1.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)'
              }}
            >
              Client velocity (last 6 months)
            </h3>
            {loading ? (
              <div data-testid="skeleton"><SkeletonLoader height="200px" borderRadius="12px" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={clientGrowthData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clients"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.primary, r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue bar chart */}
          <div
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3
              style={{
                color: 'var(--ink)',
                margin: '0 0 1.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)'
              }}
            >
              Settled revenue profile
            </h3>
            {loading ? (
              <div data-testid="skeleton"><SkeletonLoader height="200px" borderRadius="12px" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <h3
            style={{
              color: 'var(--ink)',
              margin: '0 0 1.25rem',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)'
            }}
          >
            System operational log
          </h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} data-testid="skeleton">
                  <SkeletonLoader height="40px" borderRadius="8px" />
                </div>
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.875rem' }}>
              No operational events logged.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activityItems.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'var(--cream-2)',
                    fontSize: '0.875rem',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {new Date(item.time).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add client slide-over */}
      <SlideOver
        isOpen={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        title="Add client"
      >
        <AddClientForm onSuccess={() => setAddClientOpen(false)} />
      </SlideOver>

      {/* Add mailbox slide-over */}
      <SlideOver
        isOpen={addMailboxOpen}
        onClose={() => setAddMailboxOpen(false)}
        title="Add mailbox"
      >
        <p style={{ color: 'var(--text-muted, #C4917A)', fontSize: '0.875rem' }}>
          Add mailbox form — coming soon.
        </p>
      </SlideOver>
    </div>
  );
}
