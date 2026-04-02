import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../shared/Logo';

interface PortalNavbarProps {
}

const NAV_LINKS = [
  { label: 'Dashboard', to: '/portal' },
  { label: 'Mailboxes', to: '/portal/mailboxes' },
  { label: 'Invoices', to: '/portal/invoices' },
  { label: 'Support', to: '/portal/support' },
];

export function PortalNavbar({ }: PortalNavbarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '64px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(140,16,7,0.05)',
      }}
    >
      {/* Brand */}
      <Logo onClick={() => navigate('/portal')} size="sm" />

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/portal'}
            style={({ isActive }) => ({
              padding: '0.5rem 0.875rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              background: isActive ? 'var(--cream-3)' : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* Right side: Logout + Account dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--cream-2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
          }}
        >
          Logout
        </button>

        {/* Account dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.875rem',
              background: 'var(--cream-2)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--ink)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span>{profile?.full_name ?? 'Account'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.7 }}>
              {dropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '200px',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                padding: '4px'
              }}
            >
              <NavLink
                to="/portal/account"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.75rem 1rem',
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--cream-3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                Account Settings
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
