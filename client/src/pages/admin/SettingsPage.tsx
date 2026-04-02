import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-card, var(--surface-container-low))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '10px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text-cream, var(--on-background))',
  fontSize: '1rem',
  fontWeight: 600,
  margin: '0 0 1.25rem',
};

const label: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-muted, var(--on-surface-variant))',
  fontSize: '0.8125rem',
  marginBottom: '0.375rem',
};

const input: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-page, var(--surface))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '6px',
  color: 'var(--text-cream, var(--on-background))',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  background: 'var(--primary, var(--primary))',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '0.5rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const fieldRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
};

// ─── Plan Pricing Section ─────────────────────────────────────────────────────

interface PlanPricing {
  starter: string;
  business: string;
  pro: string;
}

function PlanPricingSection() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<PlanPricing>({ starter: '3', business: '10', pro: '18' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['price_starter', 'price_business', 'price_pro']);
      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((row: { key: string; value: string }) => { map[row.key] = row.value; });
        setPrices({
          starter: map['price_starter'] ?? '3',
          business: map['price_business'] ?? '10',
          pro: map['price_pro'] ?? '18',
        });
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const rows = [
        { key: 'price_starter', value: prices.starter },
        { key: 'price_business', value: prices.business },
        { key: 'price_pro', value: prices.pro },
      ];
      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast('Plan pricing saved', 'success');
    } catch {
      toast('Failed to save pricing', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>Plan pricing</h2>
      <div style={fieldRow}>
        {(['starter', 'business', 'pro'] as const).map((plan) => (
          <div key={plan}>
            <label style={label}>{plan.charAt(0).toUpperCase() + plan.slice(1)} ($/mo)</label>
            <input
              style={input}
              type="number"
              min="0"
              value={prices[plan]}
              onChange={(e) => setPrices((p) => ({ ...p, [plan]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button style={primaryBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save pricing'}
      </button>
    </div>
  );
}

// ─── Mailcow Connection Section ───────────────────────────────────────────────

function MailcowStatusSection() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'unreachable'>('checking');

  useEffect(() => {
    apiRequest('GET', '/api/stats/overview')
      .then(() => setStatus('connected'))
      .catch(() => setStatus('unreachable'));
  }, []);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.875rem',
    borderRadius: '999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    background: status === 'connected' ? 'rgba(74,222,128,0.12)' : status === 'unreachable' ? 'rgba(248,113,113,0.12)' : 'rgba(196,145,122,0.12)',
    color: status === 'connected' ? '#4ade80' : status === 'unreachable' ? '#f87171' : 'var(--on-surface-variant)',
    border: `1px solid ${status === 'connected' ? '#4ade80' : status === 'unreachable' ? '#f87171' : 'var(--on-surface-variant)'}`,
  };

  const dot: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: status === 'connected' ? '#4ade80' : status === 'unreachable' ? '#f87171' : 'var(--on-surface-variant)',
  };

  return (
    <div style={card}>
      <h2 style={sectionTitle}>Mailcow connection</h2>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', fontSize: '0.875rem', margin: '0 0 1rem' }}>
        Live status of the Mailcow server connection.
      </p>
      <span style={badgeStyle}>
        <span style={dot} />
        {status === 'checking' ? 'Checking…' : status === 'connected' ? 'Connected' : 'Unreachable'}
      </span>
    </div>
  );
}

// ─── Admin Profile Section ────────────────────────────────────────────────────

function AdminProfileSection() {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(session?.user?.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync when profile/session loads
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [profile, session]);

  async function save() {
    setSaving(true);
    try {
      // Update name in profiles table
      if (profile?.id) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', profile.id);
        if (profileErr) throw profileErr;
      }

      // Update email / password via Supabase Auth
      const authUpdates: { email?: string; password?: string } = {};
      if (email && email !== session?.user?.email) authUpdates.email = email;
      if (password) authUpdates.password = password;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabase.auth.updateUser(authUpdates);
        if (authErr) throw authErr;
      }

      setPassword('');
      toast('Profile updated', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>Admin profile</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={label}>Full name</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label style={label}>Email</label>
          <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={label}>New password</label>
          <input
            style={input}
            type="password"
            value={password}
            placeholder="Leave blank to keep current"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <button style={primaryBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}

// ─── Business Info / Logo Section ─────────────────────────────────────────────

function BusinessInfoSection() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadLogo() {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'business_logo_url')
        .single();
      if (data?.value) setLogoUrl(data.value);
    }
    loadLogo();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Persist URL in settings
      await supabase
        .from('settings')
        .upsert({ key: 'business_logo_url', value: publicUrl }, { onConflict: 'key' });

      setLogoUrl(publicUrl);
      toast('Logo uploaded', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>Business info &amp; logo</h2>
      <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', fontSize: '0.875rem', margin: '0 0 1rem' }}>
        Upload your business logo. It will be displayed in the dashboard.
      </p>

      {logoUrl && (
        <div style={{ marginBottom: '1rem' }}>
          <img
            src={logoUrl}
            alt="Business logo"
            style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid var(--border, var(--border))' }}
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      <button
        style={primaryBtn}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1.5rem' }}>Settings</h1>
      <PlanPricingSection />
      <MailcowStatusSection />
      <AdminProfileSection />
      <BusinessInfoSection />
    </div>
  );
}
