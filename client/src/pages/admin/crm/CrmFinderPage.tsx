import { useState } from 'react';
import { Search, Star, MapPin, Phone, Globe, Check, Loader2 } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

const ZW_CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi', 'Bindura', 'Marondera', 'Victoria Falls', 'Hwange', 'Chegutu', 'Rusape', 'Zvishavane'];

interface PlaceResult {
  business_name: string;
  address: string;
  city: string;
  google_place_id: string;
  rating?: number;
  source: string;
  // enriched after details fetch
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  email_type?: string | null;
  email_provider?: string | null;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--ink)',
  padding: '0.625rem 1rem',
  fontSize: '0.875rem',
  outline: 'none',
  boxShadow: 'var(--shadow-sm)',
  transition: 'border-color 0.2s',
};

function EmailBadge({ type, provider }: { type?: string | null; provider?: string | null }) {
  if (!type || type === 'unknown') return <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 500 }}>Email unknown</span>;
  if (type === 'unprofessional') return <span style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>Uses {provider}</span>;
  return <span style={{ background: 'rgba(21, 128, 61, 0.08)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.2)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>Professional</span>;
}

export function CrmFinderPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Harare');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());

  async function handleSearch(pageToken?: string) {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ query, city });
      if (pageToken) params.set('pagetoken', pageToken);
      const data = await apiRequest<{ results: PlaceResult[]; nextPageToken?: string }>('GET', `/api/crm/search/maps?${params}`);
      setResults((prev) => pageToken ? [...prev, ...data.results] : data.results);
      setNextPageToken(data.nextPageToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      toast(msg, 'error');
    } finally { setSearching(false); }
  }

  async function importContact(place: PlaceResult) {
    if (imported.has(place.google_place_id)) return;
    setImporting((prev) => new Set(prev).add(place.google_place_id));
    try {
      const details = await apiRequest<{ phone: string | null; website: string | null }>('GET', `/api/crm/search/maps/details?place_id=${place.google_place_id}`);
      let emailData: { email: string | null; type: string; provider: string | null } = { email: null, type: 'unknown', provider: null };
      if (details.website) {
        emailData = await apiRequest('POST', '/api/crm/check-email', { website: details.website });
      }
      await apiRequest('POST', '/api/crm/contacts', {
        business_name: place.business_name,
        address: place.address,
        city: place.city,
        google_place_id: place.google_place_id,
        source: 'google_maps',
        phone: details.phone,
        website: details.website,
        email: emailData.email,
        email_type: emailData.type,
        email_provider: emailData.provider,
      });
      setImported((prev) => new Set(prev).add(place.google_place_id));
      setResults((prev) => prev.map((r) => r.google_place_id === place.google_place_id
        ? { ...r, phone: details.phone, website: details.website, email: emailData.email, email_type: emailData.type, email_provider: emailData.provider }
        : r));
      toast(`${place.business_name} imported`, 'success');
    } catch { toast('Import failed', 'error'); }
    finally { setImporting((prev) => { const s = new Set(prev); s.delete(place.google_place_id); return s; }); }
  }

  async function importAll() {
    for (const place of results) {
      if (!imported.has(place.google_place_id)) await importContact(place);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Business Intelligence Finder</h1>
        <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0', fontSize: '0.925rem', fontWeight: 500 }}>Harvest leads directly from geographic intelligence data.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry / Keyword</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "accountants", "logistics"' style={inputStyle} />
        </div>
        <div style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Region</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle}>
            {ZW_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={() => handleSearch()} disabled={searching || !query.trim()} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.75rem 1.75rem', fontWeight: 700, cursor: 'pointer', opacity: searching ? 0.7 : 1, boxShadow: 'var(--shadow-md)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {searching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          {searching ? 'Scoping...' : 'Execute Search'}
        </button>
        {results.length > 0 && (
          <button onClick={importAll} style={{ background: 'white', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}>
            Batch Import ({results.length})
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {results.map((place) => {
              const isImported = imported.has(place.google_place_id);
              const isImporting = importing.has(place.google_place_id);
              return (
                <div key={place.google_place_id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ color: 'var(--ink)', fontWeight: 800, margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>{place.business_name}</p>
                    {place.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--cream-2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <Star size={12} fill="#fb8c00" stroke="#fb8c00" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink)' }}>{place.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                      <MapPin size={14} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>{place.address}</span>
                    </div>
                    {place.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{place.phone}</span>
                      </div>
                    )}
                    {place.website && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                        <Globe size={14} style={{ flexShrink: 0 }} />
                        <a href={place.website.startsWith('http') ? place.website : `https://${place.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{place.website.replace(/^https?:\/\/(www\.)?/, '')}</a>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <EmailBadge type={place.email_type} provider={place.email_provider} />
                    <button onClick={() => importContact(place)} disabled={isImported || isImporting}
                      style={{ 
                        background: isImported ? 'rgba(21, 128, 61, 0.08)' : 'var(--primary)', 
                        color: isImported ? '#15803d' : '#ffffff', 
                        border: isImported ? '1px solid rgba(21, 128, 61, 0.2)' : 'none', 
                        borderRadius: '6px', 
                        padding: '0.5rem 1rem', 
                        cursor: isImported ? 'default' : 'pointer', 
                        fontWeight: 700, 
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                      }}>
                      {isImported ? <Check size={14} /> : isImporting ? <Loader2 size={14} className="animate-spin" /> : null}
                      {isImported ? 'Imported' : isImporting ? 'Processing' : 'Import to CRM'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {nextPageToken && (
            <button onClick={() => handleSearch(nextPageToken)} disabled={searching} style={{ alignSelf: 'center', background: 'white', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 2rem', cursor: 'pointer', fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}>
              {searching ? 'Extracting more data...' : 'Load Additional Results'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
