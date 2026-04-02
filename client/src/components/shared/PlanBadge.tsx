import type { Plan } from '../../types';

interface PlanBadgeProps {
  plan: Plan;
}

const PLAN_BG: Record<Plan, string> = {
  starter:  'var(--border)',
  business: '#660B05',
  pro:      'var(--primary)',
};

export function PlanBadge({ plan }: PlanBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: PLAN_BG[plan],
        color: plan === 'starter' ? 'var(--ink)' : '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        border: plan === 'starter' ? '1px solid var(--border)' : 'none',
      }}
    >
      {plan}
    </span>
  );
}
