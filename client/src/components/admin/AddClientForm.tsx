import { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import type { Plan } from '../../types/index';

export interface AddClientInitialValues {
  company_name?: string;
  domain?: string;
  plan?: Plan | '';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface AddClientFormProps {
  onSuccess?: () => void;
  initialValues?: AddClientInitialValues;
}

interface FormState {
  company_name: string;
  domain: string;
  plan: Plan | '';
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
}

interface FormErrors {
  company_name?: string;
  domain?: string;
  plan?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

const REQUIRED: (keyof FormErrors)[] = [
  'company_name',
  'domain',
  'plan',
  'contact_name',
  'contact_email',
  'contact_phone',
];

const PLAN_MAILBOX_LIMIT: Record<Plan, number> = {
  starter: 1,
  business: 5,
  pro: 10,
};

export function AddClientForm({ onSuccess, initialValues }: AddClientFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({
    company_name: initialValues?.company_name ?? '',
    domain: initialValues?.domain ?? '',
    plan: initialValues?.plan ?? '',
    contact_name: initialValues?.contact_name ?? '',
    contact_email: initialValues?.contact_email ?? '',
    contact_phone: initialValues?.contact_phone ?? '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    for (const field of REQUIRED) {
      const val = form[field as keyof FormState];
      if (!val || String(val).trim() === '') {
        errs[field] = 'This field is required';
      }
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Combined call: creates client record AND triggers provisioning (Mailcow domain + mailboxes)
      await apiRequest('POST', '/api/domains/add', {
        domain: form.domain,
        company_name: form.company_name,
        plan: form.plan,
        full_name: form.contact_name,
        email: form.contact_email,
        phone: form.contact_phone,
      });

      toast('Client added and provisioned successfully', 'success');
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { error?: string })?.error ?? 'Failed to add client';
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function field(
    id: keyof FormState,
    label: string,
    type: string = 'text',
    placeholder?: string
  ) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label
          htmlFor={id}
          style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: 500 }}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={form[id]}
          placeholder={placeholder}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          style={{
            background: 'var(--surface)',
            border: `1px solid ${errors[id as keyof FormErrors] ? '#F87171' : 'var(--border)'}`,
            borderRadius: '6px',
            color: 'var(--on-background)',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        {errors[id as keyof FormErrors] && (
          <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>
            {errors[id as keyof FormErrors]}
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      data-testid="add-client-form"
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {field('company_name', 'Company name', 'text', 'Acme Corp')}
      {field('domain', 'Domain', 'text', 'acme.co.zw')}

      {/* Plan select */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="plan" style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: 500 }}>
          Plan
        </label>
        <select
          id="plan"
          value={form.plan}
          onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as Plan | '' }))}
          style={{
            background: 'var(--surface)',
            border: `1px solid ${errors.plan ? '#F87171' : 'var(--border)'}`,
            borderRadius: '6px',
            color: form.plan ? 'var(--on-background)' : 'var(--on-surface-variant)',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        >
          <option value="">Select a plan</option>
          <option value="starter">Starter</option>
          <option value="business">Business</option>
          <option value="pro">Pro</option>
        </select>
        {errors.plan && (
          <span role="alert" style={{ color: '#F87171', fontSize: '0.75rem' }}>
            {errors.plan}
          </span>
        )}
      </div>

      {field('contact_name', 'Contact name', 'text', 'Jane Doe')}
      {field('contact_email', 'Contact email', 'email', 'jane@acme.co.zw')}
      {field('contact_phone', 'Contact phone', 'tel', '+263771234567')}

      {/* Notes (optional) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="notes" style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: 500 }}>
          Notes <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--on-background)',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: submitting ? '#660B05' : 'var(--primary)',
          color: 'var(--on-background)',
          border: 'none',
          borderRadius: '6px',
          padding: '0.625rem 1rem',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginTop: '0.5rem',
        }}
      >
        {submitting ? 'Adding…' : 'Add client'}
      </button>
    </form>
  );
}
