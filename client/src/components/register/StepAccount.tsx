import { useState } from 'react';
import { apiRequest } from '../../lib/api';
import type { RegistrationState } from '../../hooks/useRegistration';

interface StepAccountProps {
  path: 'A' | 'B';
  state: RegistrationState;
  onAccountField: (field: string, value: string) => void;
  onZispaField: (field: string, value: boolean) => void;
  onNext: () => void;
}

interface FieldErrors {
  full_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  password?: string;
  physical_address?: string;
  letterhead_ready?: string;
  signed_letter_ready?: string;
  id_ready?: string;
  tc_confirmed?: string;
  emailDuplicate?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-cream)',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  color: 'var(--text-cream)',
  fontSize: '0.9rem',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--danger)',
  fontSize: '0.8rem',
};

export default function StepAccount({
  path,
  state,
  onAccountField,
  onZispaField,
  onNext,
}: StepAccountProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [emailChecking, setEmailChecking] = useState(false);

  async function handleEmailBlur() {
    const email = state.email.trim();
    if (!email) return;

    setEmailChecking(true);
    try {
      const data = await apiRequest<{ exists: boolean }>(
        'GET',
        `/api/register/check-email?email=${encodeURIComponent(email)}`
      );
      if (data.exists) {
        setErrors((prev) => ({ ...prev, emailDuplicate: 'This email is already registered.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.emailDuplicate;
          return next;
        });
      }
    } catch {
      // Best-effort — don't block the user on network error
    } finally {
      setEmailChecking(false);
    }
  }

  function validate(): boolean {
    const newErrors: FieldErrors = {};

    if (!state.full_name.trim()) newErrors.full_name = 'Full name is required.';
    if (!state.company_name.trim()) newErrors.company_name = 'Company name is required.';
    if (!state.phone.trim()) newErrors.phone = 'Phone number is required.';
    if (!state.email.trim()) newErrors.email = 'Email is required.';
    if (!state.password) newErrors.password = 'Password is required.';
    else if (state.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (!state.physical_address.trim()) newErrors.physical_address = 'Physical address is required.';

    // Preserve duplicate email error if present
    if (errors.emailDuplicate) newErrors.emailDuplicate = errors.emailDuplicate;

    setErrors(newErrors);

    const hasErrors = Object.keys(newErrors).length > 0;
    return !hasErrors;
  }

  function handleContinue() {
    if (validate()) {
      onNext();
    }
  }

  return (
    <div data-testid="step-account" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Create your account</h2>

      {/* Full name */}
      <label style={labelStyle}>
        Full name
        <input
          type="text"
          data-testid="input-full-name"
          aria-label="Full name"
          value={state.full_name}
          onChange={(e) => onAccountField('full_name', e.target.value)}
          style={inputStyle}
        />
        {errors.full_name && (
          <span role="alert" style={errorStyle}>{errors.full_name}</span>
        )}
      </label>

      {/* Company name */}
      <label style={labelStyle}>
        Company name
        <input
          type="text"
          data-testid="input-company-name"
          aria-label="Company name"
          value={state.company_name}
          onChange={(e) => onAccountField('company_name', e.target.value)}
          style={inputStyle}
        />
        {errors.company_name && (
          <span role="alert" style={errorStyle}>{errors.company_name}</span>
        )}
      </label>

      {/* Phone */}
      <label style={labelStyle}>
        Phone number
        <input
          type="tel"
          data-testid="input-phone"
          aria-label="Phone number"
          value={state.phone}
          onChange={(e) => onAccountField('phone', e.target.value)}
          style={inputStyle}
        />
        {errors.phone && (
          <span role="alert" style={errorStyle}>{errors.phone}</span>
        )}
      </label>

      {/* Email */}
      <label style={labelStyle}>
        Email address
        <input
          type="email"
          data-testid="input-email"
          aria-label="Email address"
          value={state.email}
          onChange={(e) => {
            onAccountField('email', e.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.emailDuplicate;
              return next;
            });
          }}
          onBlur={handleEmailBlur}
          style={inputStyle}
        />
        {emailChecking && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Checking email…</span>
        )}
        {errors.email && (
          <span role="alert" style={errorStyle}>{errors.email}</span>
        )}
        {errors.emailDuplicate && (
          <span role="alert" data-testid="error-email-duplicate" style={errorStyle}>
            {errors.emailDuplicate}
          </span>
        )}
      </label>

      {/* Password */}
      <label style={labelStyle}>
        Password
        <input
          type="password"
          data-testid="input-password"
          aria-label="Password"
          value={state.password}
          onChange={(e) => onAccountField('password', e.target.value)}
          style={inputStyle}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Minimum 8 characters</span>
        {errors.password && (
          <span role="alert" style={errorStyle}>{errors.password}</span>
        )}
      </label>

      {/* Physical address */}
      <label style={labelStyle}>
        Physical address
        <textarea
          data-testid="input-physical-address"
          aria-label="Physical address"
          value={state.physical_address}
          onChange={(e) => onAccountField('physical_address', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        {errors.physical_address && (
          <span role="alert" style={errorStyle}>{errors.physical_address}</span>
        )}
      </label>

      <button
        type="button"
        data-testid="btn-next"
        onClick={handleContinue}
        style={{
          alignSelf: 'flex-start',
          padding: '0.625rem 1.5rem',
          background: 'var(--primary)',
          border: 'none',
          borderRadius: '6px',
          color: 'var(--text-cream)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>
  );
}
