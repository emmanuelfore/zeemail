
type StatusValue =
  | 'active'
  | 'suspended'
  | 'pending'
  | 'pending_payment'
  | 'pending_domain'
  | 'pending_dns'
  | 'pending_mailboxes'
  | 'pending_mx'
  | 'provisioning_error'
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'paid'
  | 'unpaid'
  | 'overdue'
  | 'new'
  | 'contacted'
  | 'converted'
  | 'rejected';

interface StatusBadgeProps {
  status: StatusValue;
}

const STATUS_COLORS: Record<StatusValue, { bg: string; color: string }> = {
  active:             { bg: 'rgba(21,128,61,0.1)',  color: '#15803d' },
  resolved:           { bg: 'rgba(21,128,61,0.1)',  color: '#15803d' },
  paid:               { bg: 'rgba(21,128,61,0.1)',  color: '#15803d' },
  converted:          { bg: 'rgba(21,128,61,0.1)',  color: '#15803d' },
  suspended:          { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  unpaid:             { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  rejected:           { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  pending:            { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  pending_payment:    { bg: 'rgba(185,28,28,0.1)',  color: '#b91c1c' },
  pending_domain:     { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  pending_dns:        { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  pending_mailboxes:  { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  pending_mx:         { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  provisioning_error: { bg: 'rgba(185,28,28,0.1)',  color: '#b91c1c' },
  in_progress:        { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  contacted:          { bg: 'rgba(180,83,9,0.1)',   color: '#b45309' },
  open:               { bg: 'rgba(29,78,216,0.1)',  color: '#1d4ed8' },
  new:                { bg: 'rgba(29,78,216,0.1)',  color: '#1d4ed8' },
  overdue:            { bg: 'rgba(185,28,28,0.1)',  color: '#b91c1c' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, color } = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.1)', color: 'var(--on-background)' };
  const label = status.replace('_', ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: bg,
        color,
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  );
}
