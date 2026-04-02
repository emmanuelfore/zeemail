import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, LayoutDashboard, Send } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CrmStats {
  total: number;
  warmLeads: number;
  addedThisWeek: number;
  wonThisMonth: number;
  byStage: Record<string, number>;
}

const card: React.CSSProperties = {
  background: 'white', 
  border: '1px solid var(--border)', 
  borderRadius: '16px', 
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)'
};

export function CrmOverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<CrmStats>('GET', '/api/crm/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const funnelData = stats ? [
    { stage: 'New', count: stats.byStage.new ?? 0 },
    { stage: 'Contacted', count: stats.byStage.contacted ?? 0 },
    { stage: 'Negotiating', count: stats.byStage.negotiating ?? 0 },
    { stage: 'Won', count: stats.byStage.won ?? 0 },
  ] : [];

  const metricCards = [
    { label: 'Total contacts', value: stats?.total ?? 0 },
    { label: 'Warm leads', value: stats?.warmLeads ?? 0 },
    { label: 'Added this week', value: stats?.addedThisWeek ?? 0 },
    { label: 'Won this month', value: stats?.wonThisMonth ?? 0 },
  ];

  const quickActions = [
    { label: 'Find businesses', to: '/admin/crm/finder', icon: Search },
    { label: 'View warm leads', to: '/admin/crm/contacts?filter=warm', icon: Heart },
    { label: 'Open pipeline', to: '/admin/crm/pipeline', icon: LayoutDashboard },
    { label: 'New blast', to: '/admin/crm/blast', icon: Send },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ color: 'var(--on-background)', margin: 0 }}>CRM Overview</h1>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height="80px" borderRadius="10px" />) :
          metricCards.map((m) => (
            <div key={m.label} style={card}>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', margin: '0 0 0.25rem' }}>{m.label}</p>
              <p style={{ color: 'var(--on-background)', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{m.value}</p>
            </div>
          ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button 
              key={a.to} 
              onClick={() => navigate(a.to)} 
              style={{
                background: 'var(--primary)', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '8px',
                padding: '0.625rem 1.25rem', 
                fontWeight: 700, 
                fontSize: '0.875rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Icon size={16} />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Funnel chart */}
      {!loading && funnelData.length > 0 && (
        <div style={{ ...card }}>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', margin: '0 0 1rem' }}>Conversion funnel</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData}>
              <XAxis dataKey="stage" tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-container-low)', border: '1px solid var(--border)', color: 'var(--on-background)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnelData.map((_, i) => <Cell key={i} fill={i === 3 ? '#4ade80' : 'var(--primary)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
