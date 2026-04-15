import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  ReceiptText, 
  ClipboardList, 
  Target, 
  Settings, 
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
  Server
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NavItem {
  label: string;
  to: string;
  icon?: any;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Clients', to: '/admin/clients', icon: Users },
  { label: 'Mailboxes', to: '/admin/mailboxes', icon: Mail },
  { label: 'Mailcow Domains', to: '/admin/mailcow-domains', icon: Server },
  { label: 'Invoices', to: '/admin/invoices', icon: ReceiptText },
  { label: 'Leads', to: '/admin/leads', icon: ClipboardList },
  { label: 'Support', to: '/admin/support', icon: LifeBuoy },
  { 
    label: 'CRM', 
    to: '/admin/crm', 
    icon: Target,
    children: [
      { label: 'Overview', to: '/admin/crm', icon: LayoutDashboard },
      { label: 'Contacts', to: '/admin/crm/contacts', icon: ClipboardList },
      { label: 'Finder', to: '/admin/crm/finder', icon: Target },
      { label: 'Pipeline', to: '/admin/crm/pipeline', icon: ClipboardList },
      { label: 'Blast', to: '/admin/crm/blast', icon: Mail },
    ]
  },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [crmExpanded, setCrmExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const isCrmPath = location.pathname.startsWith('/admin/crm');

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
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = item.label === 'CRM' ? crmExpanded : false;

          if (hasChildren) {
            return (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <button
                  onClick={() => item.label === 'CRM' && setCrmExpanded(!crmExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.75rem 0.875rem',
                    textDecoration: 'none',
                    color: isCrmPath ? 'var(--ink)' : 'var(--muted)',
                    background: isCrmPath && !isExpanded ? 'var(--cream-3)' : 'transparent',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    borderRadius: '0.75rem',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCrmPath || isExpanded) {
                      e.currentTarget.style.background = 'var(--cream-2)';
                      e.currentTarget.style.color = 'var(--ink)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCrmPath || isExpanded) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isCrmPath ? 2.5 : 2} 
                    style={{ 
                      flexShrink: 0,
                      color: isCrmPath ? 'var(--primary)' : 'inherit',
                      transition: 'color 0.2s'
                    }} 
                  />
                  {!collapsed && (
                    <>
                      <span style={{ fontSize: '0.925rem', fontWeight: isCrmPath ? 600 : 500, flex: 1 }}>{item.label}</span>
                      <div style={{
                        transition: 'transform 0.3s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        display: 'flex'
                      }}>
                        <ChevronDown size={16} strokeWidth={2.5} />
                      </div>
                    </>
                  )}
                </button>
                
                {!collapsed && isExpanded && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.125rem',
                    marginLeft: '1.25rem',
                    paddingLeft: '1rem',
                    borderLeft: '2px solid var(--border)',
                    marginTop: '0.125rem',
                    marginBottom: '0.25rem',
                  }}>
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={child.to === '/admin/crm'}
                          style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.45rem 0.75rem',
                            textDecoration: 'none',
                            color: isActive ? 'var(--ink)' : 'var(--muted)',
                            background: isActive ? 'var(--cream-3)' : 'transparent',
                            borderRadius: '0.5rem',
                            transition: 'all 0.2s',
                            position: 'relative',
                          })}
                        >
                          {({ isActive }) => (
                            <>
                              <ChildIcon size={14} strokeWidth={isActive ? 2.5 : 2} />
                              <span style={{ 
                                fontSize: '0.8125rem', 
                                fontWeight: isActive ? 700 : 500,
                              }}>
                                {child.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
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
                color: location.pathname === item.to || (item.to === '/admin' && location.pathname === '/admin') ? 'var(--primary)' : 'inherit'
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
