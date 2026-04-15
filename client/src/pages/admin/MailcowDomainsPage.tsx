import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { apiRequest } from '../../lib/api';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { useToast } from '../../hooks/useToast';
import { StatusBadge } from '../../components/shared/StatusBadge';

interface MailcowDomain {
  domain: string;
  description: string;
  max_quota: number; // MiB
  quota_used: number; // MiB
  max_mailboxes: number;
  mailboxes_count: number;
  active: number;
  mailboxes?: any[]; // For expansion
}

const cardStyle: CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)'
};

export function MailcowDomainsPage() {
  const [domains, setDomains] = useState<MailcowDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<MailcowDomain[]>('GET', '/api/stats/mailcow-domains');
      setDomains(data);
    } catch (err: any) {
      toast('Failed to load Mailcow domains', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProvision = async () => {
    if (!newDomain.trim()) {
      toast('Please enter a domain', 'error');
      return;
    }
    setProvisioning(true);
    try {
      await apiRequest('POST', '/api/mailboxes/add-domain', { domain: newDomain.trim() });
      toast('Domain provisioned successfully!', 'success');
      setNewDomain('');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast(err.error || 'Failed to provision domain', 'error');
    } finally {
      setProvisioning(false);
    }
  };

  const toggleExpand = async (domain: string) => {
    if (expandedDomain === domain) {
      setExpandedDomain(null);
      return;
    }
    
    setExpandedDomain(domain);
    
    // Find domain and check if mailboxes already loaded
    const dIdx = domains.findIndex(d => d.domain === domain);
    if (domains[dIdx].mailboxes) return;

    try {
      const mailboxes = await apiRequest<any[]>('GET', `/api/mailboxes/${domain}`);
      const newDomains = [...domains];
      newDomains[dIdx] = { ...newDomains[dIdx], mailboxes };
      setDomains(newDomains);
    } catch (err: any) {
      toast(`Failed to load mailboxes for ${domain}`, 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Mailcow Domains
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0', fontSize: '0.925rem' }}>
            Direct view of all domains provisioned on the Mailcow server.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.625rem 1.25rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          New Domain
        </button>
      </div>

      {showModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setShowModal(false)}>
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '2rem', 
            width: '100%', 
            maxWidth: '400px', 
            boxShadow: 'var(--shadow-xl)' 
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Provision Domain</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>
                  DOMAIN NAME
                </label>
                <input 
                  type="text" 
                  value={newDomain} 
                  onChange={e => setNewDomain(e.target.value)} 
                  placeholder="example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '1rem'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button 
                  onClick={handleProvision} 
                  disabled={provisioning}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 700,
                    cursor: provisioning ? 'not-allowed' : 'pointer',
                    opacity: provisioning ? 0.7 : 1
                  }}
                >
                  {provisioning ? 'Provisioning...' : 'Provision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        {loading ? (
          <SkeletonLoader height="300px" borderRadius="12px" />
        ) : domains.length === 0 ? (
          <EmptyState 
            heading="No domains found" 
            subtext="There are no domains provisioned on Mailcow yet." 
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['', 'Domain', 'Mailboxes', 'Quota Usage', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <Fragment key={d.domain}>
                  <tr 
                    style={{ 
                      borderBottom: expandedDomain === d.domain ? 'none' : '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleExpand(d.domain)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem', width: '40px' }}>
                      <svg 
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: expandedDomain === d.domain ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.domain}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{d.description}</div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--ink)' }}>
                      {d.mailboxes_count} / {d.max_mailboxes === 0 ? '∞' : d.max_mailboxes}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ width: '100px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (d.quota_used / (d.max_quota || 1)) * 100)}%`, 
                          background: 'var(--primary)' 
                        }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {d.quota_used >= 1024 
                          ? `${(d.quota_used / 1024).toFixed(1)} GB` 
                          : `${d.quota_used} MB`} / {d.max_quota >= 1024 
                            ? `${(d.max_quota / 1024).toFixed(1)} GB` 
                            : `${d.max_quota} MB`}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge status={d.active ? 'active' : 'suspended'} />
                    </td>
                  </tr>
                  {expandedDomain === d.domain && (
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--cream-2)' }}>
                      <td colSpan={5} style={{ padding: '1rem 3rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 700 }}>Domain Mailboxes</h4>
                          {d.mailboxes === undefined ? (
                            <SkeletonLoader height="100px" borderRadius="8px" />
                          ) : d.mailboxes.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>No mailboxes in this domain.</p>
                          ) : (
                            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Address', 'Name', 'Usage', 'Status'].map(h => (
                                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {d.mailboxes.map(mb => (
                                    <tr key={mb.email}>
                                      <td style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>{mb.email}</td>
                                      <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{mb.name}</td>
                                      <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                                        {Math.round(mb.quota_used_mb || 0)} MB / {mb.quota_mb} MB
                                      </td>
                                      <td style={{ padding: '0.5rem' }}>
                                        <StatusBadge status={mb.active ? 'active' : 'suspended'} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) }
      </div>
    </div>
  );
}
