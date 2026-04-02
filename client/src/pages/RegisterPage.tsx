import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRegistration } from '../hooks/useRegistration';
import PathToggle from '../components/register/PathToggle';
import StepDomainSearch from '../components/register/StepDomainSearch';
import StepDomainVerify from '../components/register/StepDomainVerify';
import StepPlanSelect from '../components/register/StepPlanSelect';
import StepAccount from '../components/register/StepAccount';
import StepDnsInstructions from '../components/register/StepDnsInstructions';
import { Logo } from '../components/shared/Logo';
import { apiRequest } from '../lib/api';

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registration = useRegistration();
  const [step, setStep] = useState(1);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Handle "Resume DNS" from dashboard
  useEffect(() => {
    const state = location.state as { resumeDns?: boolean; clientId?: string; domain?: string } | null;
    if (state?.resumeDns && state.clientId && state.domain) {
      registration.setPath('B');
      registration.setDomain(state.domain);
      registration.setClientId(state.clientId);
      setStep(4);
    }
  }, []);

  const { path } = registration;

  // Path A: domain search → plan → account (3 steps)
  // Path B: domain verify → plan → account → DNS instructions (4 steps)
  const totalSteps = path === 'A' ? 3 : 4;

  function next() { setStep((s) => Math.min(s + 1, totalSteps)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  async function handleAccountNext() {
    setRegisterError('');
    setRegistering(true);
    try {
      // 1. Create account on backend
      const res = await apiRequest<{ clientId: string; userId: string }>(
        'POST',
        '/api/register',
        {
          path,
          domain: registration.domain,
          plan: registration.plan,
          billing_cycle: registration.billing_cycle,
          company_name: registration.company_name,
          full_name: registration.full_name,
          email: registration.email,
          password: registration.password,
          phone: registration.phone,
          physical_address: registration.physical_address,
          previous_email_provider: registration.previous_email_provider,
          letterhead_ready: registration.letterhead_ready,
          signed_letter_ready: registration.signed_letter_ready,
          id_ready: registration.id_ready,
          tc_confirmed: registration.tc_confirmed,
        }
      );

      registration.setClientId(res.clientId);
      registration.setUserId(res.userId);

      // 2. Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: registration.email,
        password: registration.password,
      });

      if (loginError) throw loginError;

      // 3. Success -> Navigate to portal or Path B DNS step
      if (path === 'A') {
        navigate('/portal');
      } else {
        next(); // Go to DNS instructions
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? String((err as { error: string }).error)
          : err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setRegisterError(msg);
    } finally {
      setRegistering(false);
    }
  }

  function renderStep() {
    if (path === 'A') {
      switch (step) {
        case 1:
          return (
            <StepDomainSearch
              domain={registration.domain}
              availability={registration.domainAvailability as 'idle' | 'loading' | 'available' | 'taken' | 'error'}
              onDomainChange={registration.setDomain}
              onAvailabilityChange={registration.setDomainAvailability}
              onNext={next}
            />
          );
        case 2:
          return (
            <StepPlanSelect
              path={path}
              selectedPlan={registration.plan}
              billingCycle={registration.billing_cycle}
              onPlanSelect={registration.setPlan}
              onBillingCycleChange={registration.setBillingCycle}
              onNext={next}
            />
          );
        case 3:
          return (
            <StepAccount
              path={path}
              state={registration}
              onAccountField={(field, value) => registration.setAccountField(field as Parameters<typeof registration.setAccountField>[0], value)}
              onZispaField={(field, value) => registration.setZispaField(field as Parameters<typeof registration.setZispaField>[0], value)}
              onNext={handleAccountNext}
            />
          );
        default:
          return null;
      }
    }

    // Path B
    switch (step) {
      case 1:
        return (
          <StepDomainVerify
            domain={registration.domain}
            onDomainChange={registration.setDomain}
            previousEmailProvider={registration.previous_email_provider}
            onProviderDetected={(p) => registration.setAccountField('previous_email_provider', p)}
            onNext={next}
          />
        );
      case 2:
        return (
          <StepPlanSelect
            path={path}
            selectedPlan={registration.plan}
            billingCycle={registration.billing_cycle}
            onPlanSelect={registration.setPlan}
            onBillingCycleChange={registration.setBillingCycle}
            onNext={next}
          />
        );
      case 3:
        return (
          <StepAccount
            path={path}
            state={registration}
            onAccountField={(field, value) => registration.setAccountField(field as Parameters<typeof registration.setAccountField>[0], value)}
            onZispaField={(field, value) => registration.setZispaField(field as Parameters<typeof registration.setZispaField>[0], value)}
            onNext={handleAccountNext}
          />
        );
        case 4:
          return (
            <StepDnsInstructions
              domain={registration.domain}
              clientId={registration.clientId}
              previousEmailProvider={registration.previous_email_provider}
            />
          );
      default:
        return null;
    }
  }

  // Step labels for progress indicator
  const stepLabels = path === 'A'
    ? ['Domain', 'Plan', 'Account']
    : ['Domain', 'Plan', 'Account', 'DNS Setup'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-cream)', fontFamily: 'var(--font-body)' }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px'
      }}>
        <Logo onClick={() => navigate('/')} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
          Step {step} of {totalSteps}
        </span>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}>
        {/* Path toggle — only on step 1 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 style={{ color: 'var(--text-cream)', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                Get your business email
              </h1>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1.0625rem' }}>
                Register a new .co.zw domain or host email on your existing domain.
              </p>
            </div>
            <PathToggle
              path={path}
              onPathChange={(p) => { registration.setPath(p); setStep(1); }}
              onReset={registration.resetDomain}
            />
          </div>
        )}

        {/* Progress steps */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const isActive = n === step;
            const isDone = n < step;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: n < stepLabels.length ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isDone ? 'var(--primary)' : isActive ? 'var(--primary)' : 'var(--bg-card)',
                    border: `2px solid ${isActive || isDone ? 'var(--primary)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-cream)',
                    flexShrink: 0,
                  }}>
                    {isDone ? '✓' : n}
                  </div>
                  <span style={{
                    fontSize: '0.8125rem',
                    color: isActive ? 'var(--text-cream)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {label}
                  </span>
                </div>
                {n < stepLabels.length && (
                  <div style={{
                    flex: 1,
                    height: '1px',
                    background: isDone ? 'var(--primary)' : 'var(--border)',
                    minWidth: '12px',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Registration error (from /api/register call) */}
        {registerError && (
          <p role="alert" style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9rem' }}>
            {registerError}
          </p>
        )}

        {/* Registering spinner */}
        {registering && (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Creating your account…</p>
        )}

        {/* Step content */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.75rem',
        }}>
          {renderStep()}
        </div>

        {/* Back button (not on step 1, not on DNS step if it's the last one) */}
        {step > 1 && step < totalSteps && (
          <button
            type="button"
            data-testid="btn-back"
            onClick={back}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

export { RegisterPage };
export default RegisterPage;
