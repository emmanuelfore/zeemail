import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { PlanBadge } from '../../components/shared/PlanBadge';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import type { Client, Plan } from '../../types/index';

const PLAN_PRICE: Record<Plan, number> = {
  starter: 5,
  business: 12,
  pro: 25,
};

const PLAN_MAILBOX_LIMIT: Record<Plan, number> = {
  starter: 1,
  business: 5,
  pro: 10,
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-card, var(--surface-container-low))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '10px',
  padding: '1.5rem',
};

const labelStyle: CSSProperties = {
  color: 'var(--text-muted, var(--on-surface-variant))',
  fontSize: '0.8rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

const valueStyle: CSSProperties = {
  color: 'var(--text-cream, var(--on-background))',
  fontSize: '0.95rem',
};

export function PortalAccountPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [upgradingPlan, setUpgradingPlan] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('profile_id', profile!.id)
          .single();

        if (error) throw error;
        const currentProfile = profile;
        if (!cancelled && data && currentProfile) {
          setClient(data);
          setAddress(data.physical_address || '');
          setFullName(currentProfile.full_name || '');
          setPhone(currentProfile.phone || '');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load account details';
        toast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [profile?.id, toast]);

  async function handleSaveProfile() {
    if (!profile?.id || !client) return;
    setSavingProfile(true);
    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          phone: phone 
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 2. Update clients table (for address)
      const { error: clientError } = await supabase
        .from('clients')
        .update({ physical_address: address })
        .eq('id', client.id);

      if (clientError) throw clientError;

      toast('Profile updated successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast(message, 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setNewPassword('');
      setConfirmPassword('');
      toast('Password updated successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      toast(message, 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleUpgradePlan() {
    if (!client) return;
    setUpgradingPlan(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        client_id: client.id,
        subject: 'Request: Plan upgrade',
        message: `I would like to request a plan upgrade. Current plan: ${client.plan}.`,
        status: 'open',
      });
      if (error) throw error;
      toast('Upgrade request submitted', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit upgrade request';
      toast(message, 'error');
    } finally {
      setUpgradingPlan(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page header */}
      <div>
        <h1 style={{ color: 'var(--text-cream, var(--on-background))', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          Account
        </h1>
        <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          View your account details and manage your subscription.
        </p>
      </div>

      {/* Company details card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>
          Company Details
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <SkeletonLoader height="40px" borderRadius="6px" />
            <SkeletonLoader height="40px" borderRadius="6px" />
            <SkeletonLoader height="40px" borderRadius="6px" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <p style={labelStyle}>Company Name</p>
              <p style={valueStyle}>{client?.company_name ?? '—'}</p>
            </div>

            <div>
              <p style={labelStyle}>Domain</p>
              <p style={{ ...valueStyle, fontFamily: '"JetBrains Mono", monospace' }}>
                {client?.domain ?? '—'}
              </p>
            </div>

            <div>
              <p style={labelStyle}>Plan</p>
              {client?.plan ? <PlanBadge plan={client.plan} /> : <span style={valueStyle}>—</span>}
            </div>

            <div>
              <p style={labelStyle}>Status</p>
              {client?.status ? <StatusBadge status={client.status} /> : <span style={valueStyle}>—</span>}
            </div>
          </div>
        )}
      </div>

      {/* Plan card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>
          Current Plan
        </h2>

        {loading ? (
          <SkeletonLoader height="80px" borderRadius="6px" />
        ) : client ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <PlanBadge plan={client.plan} />
                <span style={{ color: 'var(--text-cream, var(--on-background))', fontWeight: 700, fontSize: '1.1rem' }}>
                  ${PLAN_PRICE[client.plan]}/mo
                </span>
              </div>
              <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0, fontSize: '0.875rem' }}>
                Up to {PLAN_MAILBOX_LIMIT[client.plan]} mailbox{PLAN_MAILBOX_LIMIT[client.plan] !== 1 ? 'es' : ''} • Billed monthly
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleUpgradePlan}
                disabled={upgradingPlan}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.625rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: upgradingPlan ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Change Plan
              </button>
              <button
                onClick={handleUpgradePlan}
                disabled={upgradingPlan}
                style={{
                  background: 'var(--primary, var(--primary))',
                  color: 'var(--text-cream, var(--on-background))',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.625rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: upgradingPlan ? 'not-allowed' : 'pointer',
                  opacity: upgradingPlan ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {upgradingPlan ? 'Submitting…' : 'Switch to Annual (Save 20%)'}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted, var(--on-surface-variant))', margin: 0 }}>No plan information available.</p>
        )}
      </div>

      {/* Contact details card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>
          Profile & Contact
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Physical Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          style={{
            marginTop: '1.5rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.625rem 1.5rem',
            fontWeight: 600,
            cursor: savingProfile ? 'not-allowed' : 'pointer',
            opacity: savingProfile ? 0.7 : 1,
          }}
        >
          {savingProfile ? 'Saving...' : 'Update Profile'}
        </button>
      </div>

      {/* Security card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text-cream, var(--on-background))', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>
          Security
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changingPassword}
          style={{
            marginTop: '1.5rem',
            background: 'transparent',
            color: 'var(--text-cream)',
            border: '1px solid var(--primary)',
            borderRadius: '8px',
            padding: '0.625rem 1.5rem',
            fontWeight: 600,
            cursor: changingPassword ? 'not-allowed' : 'pointer',
          }}
        >
          {changingPassword ? 'Updating...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.625rem 0.875rem',
  color: 'var(--text-cream)',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};
