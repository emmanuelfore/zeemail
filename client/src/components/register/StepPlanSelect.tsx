import type { Plan } from '../../types';

const PLANS: Array<{
  id: Plan;
  label: string;
  priceAnnual: number;
  mailboxes: number;
  description: string;
}> = [
  { id: 'starter',  label: 'Starter',  priceAnnual: 36,  mailboxes: 5,  description: '5 mailboxes — perfect for solo operators' },
  { id: 'business', label: 'Business', priceAnnual: 72,  mailboxes: 10, description: '10 mailboxes — great for small teams' },
  { id: 'pro',      label: 'Pro',      priceAnnual: 180, mailboxes: 20, description: '20 mailboxes — built for growing businesses' },
];

const DOMAIN_FEE = 0;

interface StepPlanSelectProps {
  path: 'A' | 'B';
  selectedPlan: Plan | null;
  onPlanSelect: (plan: Plan) => void;
  onNext: () => void;
}

export default function StepPlanSelect({
  path,
  selectedPlan,
  onPlanSelect,
  onNext,
}: StepPlanSelectProps) {
  const showDomainFee = path === 'A';

  return (
    <div data-testid="step-plan-select" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 style={{ color: 'var(--text-cream)', margin: 0 }}>Choose your plan</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const planPriceMonthlyEquivalent = Math.round(plan.priceAnnual / 12);
          const firstMonthTotal = showDomainFee ? plan.priceAnnual + DOMAIN_FEE : plan.priceAnnual;

          return (
            <button
              key={plan.id}
              type="button"
              data-testid={`plan-card-${plan.id}`}
              aria-pressed={isSelected}
              onClick={() => onPlanSelect(plan.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '1rem 1.25rem',
                background: 'var(--bg-card)',
                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '8px',
                color: 'var(--text-cream)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{plan.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <div data-testid={`plan-price-${plan.id}`} style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    ${planPriceMonthlyEquivalent}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    billed annually (${plan.priceAnnual}/yr)
                  </div>
                </div>
              </div>

              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {plan.description}
              </span>

              <span
                data-testid={`plan-mailboxes-${plan.id}`}
                style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}
              >
                {plan.mailboxes} mailbox{plan.mailboxes !== 1 ? 'es' : ''} included
              </span>

              {showDomainFee && (
                <div
                  data-testid={`plan-domain-fee-${plan.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>+ Domain registration fee</span>
                  <span>Free</span>
                </div>
              )}

              <div
                data-testid={`plan-total-${plan.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: isSelected ? 'var(--text-cream)' : 'var(--text-muted)',
                  borderTop: showDomainFee ? 'none' : '1px solid var(--border)',
                  paddingTop: showDomainFee ? 0 : '0.5rem',
                }}
              >
                <span>Initial Total</span>
                <span>${firstMonthTotal}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        data-testid="btn-next"
        disabled={!selectedPlan}
        onClick={onNext}
        style={{
          alignSelf: 'flex-start',
          padding: '0.625rem 1.5rem',
          background: selectedPlan ? 'var(--primary)' : 'var(--primary-dark)',
          border: 'none',
          borderRadius: '6px',
          color: 'var(--text-cream)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: selectedPlan ? 'pointer' : 'not-allowed',
          opacity: selectedPlan ? 1 : 0.5,
        }}
      >
        Continue
      </button>
    </div>
  );
}
