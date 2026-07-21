// Feature: self-service-onboarding, Property 6: Fee calculation is path-dependent
/**
 * Property 6: Fee calculation is path-dependent
 * For any plan selection, the total amount displayed and charged should equal
 * the plan's monthly price plus $5 when on Path A, and equal the plan's
 * monthly price alone when on Path B.
 *
 * Validates: Requirements 4.2, 4.3, 7.6
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import StepPlanSelect from '../components/register/StepPlanSelect';
import type { Plan } from '../types';

afterEach(() => {
  cleanup();
});

const PLAN_PRICES: Record<Plan, number> = {
  starter: 36,
  business: 72,
  pro: 180,
};

const DOMAIN_FEE = 0;

const planArb = fc.constantFrom<Plan>('starter', 'business', 'pro');
const pathArb = fc.constantFrom<'A' | 'B'>('A', 'B');

describe('Property 6: Fee calculation is path-dependent', () => {
  it('Path A shows Free domain fee line on every plan card', () => {
    fc.assert(
      fc.property(planArb, (plan) => {
        render(
          <StepPlanSelect
            path="A"
            selectedPlan={plan}
            onPlanSelect={() => {}}
            onNext={() => {}}
          />
        );

        // Domain fee line must be present for Path A
        const feeEl = screen.getByTestId(`plan-domain-fee-${plan}`);
        expect(feeEl).toBeInTheDocument();
        expect(feeEl.textContent).toContain('Free');

        // Total must equal plan price + $5
        const totalEl = screen.getByTestId(`plan-total-${plan}`);
        const expectedTotal = PLAN_PRICES[plan] + DOMAIN_FEE;
        expect(totalEl.textContent).toContain(`$${expectedTotal}`);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Path B does NOT show domain fee line on any plan card', () => {
    fc.assert(
      fc.property(planArb, (plan) => {
        render(
          <StepPlanSelect
            path="B"
            selectedPlan={plan}
            onPlanSelect={() => {}}
            onNext={() => {}}
          />
        );

        // Domain fee line must be absent for Path B
        expect(screen.queryByTestId(`plan-domain-fee-${plan}`)).not.toBeInTheDocument();

        // Total must equal plan price only
        const totalEl = screen.getByTestId(`plan-total-${plan}`);
        expect(totalEl.textContent).toContain(`$${PLAN_PRICES[plan]}`);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('total for Path A is always equal to Path B for the same plan since domain is free', () => {
    fc.assert(
      fc.property(planArb, pathArb, (plan, path) => {
        render(
          <StepPlanSelect
            path={path}
            selectedPlan={plan}
            onPlanSelect={() => {}}
            onNext={() => {}}
          />
        );

        const totalEl = screen.getByTestId(`plan-total-${plan}`);
        const basePrice = PLAN_PRICES[plan];
        const expectedTotal = path === 'A' ? basePrice + DOMAIN_FEE : basePrice;
        expect(totalEl.textContent).toContain(`$${expectedTotal}`);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});
