import { useState } from 'react';

interface SupportTicketFormProps {
  onSubmit: (subject: string, message: string) => Promise<boolean>;
  onCancel?: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-page, var(--surface))',
  border: '1px solid var(--border, var(--border))',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--text-cream, var(--on-background))',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-muted, var(--on-surface-variant))',
  fontSize: '0.8125rem',
  marginBottom: '0.375rem',
};

export function SupportTicketForm({ onSubmit, onCancel }: SupportTicketFormProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;

    if (!subject.trim()) {
      setSubjectError('Subject is required.');
      valid = false;
    } else {
      setSubjectError('');
    }

    if (!message.trim()) {
      setMessageError('Message is required.');
      valid = false;
    } else {
      setMessageError('');
    }

    if (!valid) return;

    setSubmitting(true);
    const ok = await onSubmit(subject.trim(), message.trim());
    setSubmitting(false);

    if (ok) {
      setSubject('');
      setMessage('');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="ticket-subject" style={labelStyle}>Subject</label>
        <input
          id="ticket-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          style={inputStyle}
          data-testid="subject-input"
        />
        {subjectError && <p style={errorStyle} data-testid="subject-error">{subjectError}</p>}
      </div>

      <div>
        <label htmlFor="ticket-message" style={labelStyle}>Message</label>
        <textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue in detail..."
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
          data-testid="message-input"
        />
        {messageError && <p style={errorStyle} data-testid="message-error">{messageError}</p>}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'var(--text-muted, var(--on-surface-variant))',
              border: '1px solid var(--border, var(--border))',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: 'var(--primary, var(--primary))',
            color: 'var(--text-cream, var(--on-background))',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1.25rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            opacity: submitting ? 0.7 : 1,
          }}
          data-testid="submit-ticket-btn"
        >
          {submitting ? 'Submitting…' : 'Submit ticket'}
        </button>
      </div>
    </form>
  );
}
