import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, var(--surface))' }}>
      <Outlet />
    </div>
  );
}

export function AdminOverviewPage() {
  return (
    <div style={{ padding: '2rem', color: 'var(--text-cream, var(--on-background))' }}>
      <h1>Admin Dashboard</h1>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))' }}>Overview — coming soon.</p>
    </div>
  );
}
