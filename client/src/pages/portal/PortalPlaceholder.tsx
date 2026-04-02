import { Outlet } from 'react-router-dom';

export function PortalLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, var(--surface))' }}>
      <Outlet />
    </div>
  );
}

export function PortalDashboardPage() {
  return (
    <div style={{ padding: '2rem', color: 'var(--text-cream, var(--on-background))' }}>
      <h1>Client Portal</h1>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))' }}>Dashboard — coming soon.</p>
    </div>
  );
}
