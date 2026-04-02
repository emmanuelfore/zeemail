import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  ReceiptText, 
  Settings, 
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  to: string;
  icon?: any;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/portal', icon: LayoutDashboard },
  { label: 'Mailboxes', to: '/portal/mailboxes', icon: Mail },
  { label: 'Invoices', to: '/portal/invoices', icon: ReceiptText },
  { label: 'Support', to: '/portal/support', icon: LifeBuoy },
  { label: 'Account', to: '/portal/account', icon: Settings },
];

export function PortalSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'white',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        overflow: 'hidden',
        zIndex: 50,
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header / toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '1.5rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {!collapsed && (
          <span
            style={{
              color: 'var(--ink)',
              fontWeight: 800,
              fontSize: '1.25rem',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.02em',
            }}
          >
            ZeeMail
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'var(--cream-2)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cream-3)';
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--cream-2)';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav links */}
      <nav 
        style={{ 
          flex: 1, 
          padding: '1.25rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem 0.875rem',
                textDecoration: 'none',
                color: isActive ? 'var(--ink)' : 'var(--muted)',
                background: isActive ? 'var(--cream-3)' : 'transparent',
                borderRadius: '0.75rem',
                transition: 'all 0.2s',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes('var(--cream-3)')) {
                  e.currentTarget.style.background = 'var(--cream-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.getAttribute('data-active')) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={20} strokeWidth={2} style={{ 
                flexShrink: 0,
                color: location.pathname === item.to || (item.to === '/portal' && location.pathname === '/portal') ? 'var(--primary)' : 'inherit'
              }} />
              {!collapsed && (
                <span style={{ fontSize: '0.925rem', fontWeight: 600 }}>{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0.75rem' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.875rem',
            width: '100%',
            padding: '0.75rem 0.875rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            borderRadius: '0.75rem',
            transition: 'all 0.2s',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cream-2)';
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          <LogOut size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontSize: '0.925rem', fontWeight: 600 }}>Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
}
