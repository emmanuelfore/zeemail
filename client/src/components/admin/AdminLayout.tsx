import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-page, #0D0100)',
      }}
    >
      <AdminSidebar />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem',
          color: 'var(--text-cream, #FFF0C4)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
