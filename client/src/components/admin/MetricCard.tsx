import { type ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div
      data-testid="metric-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {icon && <div style={{ color: 'var(--primary)', opacity: 0.8 }}>{icon}</div>}
      </div>
      <span
        style={{
          color: 'var(--ink)',
          fontSize: '1.75rem',
          fontWeight: 800,
          lineHeight: 1.1,
          fontFamily: 'var(--font-heading)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
