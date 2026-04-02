/**
 * Property 21: Plan pre-selection from pricing cards
 * For any plan card "Get started" button click, the registration form's plan
 * selector must be pre-selected with that specific plan. No other plan may be
 * selected as a result of that click.
 *
 * Validates: Requirements 21.5
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import PricingSection from '../components/landing/PricingSection';
import type { Plan } from '../types';

afterEach(() => {
  cleanup();
});

const planArb = fc.constantFrom<Plan>('starter', 'business', 'pro');

describe('Property 21: Plan pre-selection from pricing cards', () => {
  it('clicking Get started calls onSelectPlan with exactly that plan', async () => {
    await fc.assert(
      fc.asyncProperty(planArb, async (plan) => {
        const onSelectPlan = vi.fn();
        const user = userEvent.setup();

        render(<PricingSection onSelectPlan={onSelectPlan} />);

        const button = screen.getByTestId(`get-started-${plan}`);
        await user.click(button);

        // Must have been called exactly once with the correct plan
        expect(onSelectPlan).toHaveBeenCalledTimes(1);
        expect(onSelectPlan).toHaveBeenCalledWith(plan);

        // No other plan was passed
        const calledWith = onSelectPlan.mock.calls[0][0] as Plan;
        expect(calledWith).toBe(plan);

        cleanup();
      }),
      { numRuns: 10 }
    );
  });

  it('each plan card only triggers its own plan, not any other', async () => {
    await fc.assert(
      fc.asyncProperty(planArb, async (plan) => {
        const onSelectPlan = vi.fn();
        const user = userEvent.setup();

        render(<PricingSection onSelectPlan={onSelectPlan} />);

        await user.click(screen.getByTestId(`get-started-${plan}`));

        const allPlans: Plan[] = ['starter', 'business', 'pro'];
        const otherPlans = allPlans.filter((p) => p !== plan);

        // The called plan must not be any of the other plans
        const calledWith = onSelectPlan.mock.calls[0][0] as Plan;
        expect(otherPlans).not.toContain(calledWith);

        cleanup();
      }),
      { numRuns: 10 }
    );
  });
});

// Feature: self-service-onboarding, Property 7: URL plan parameter pre-selects plan on load
/**
 * Property 7: URL plan parameter pre-selects plan on load
 * For any valid plan value (starter, business, pro) passed as a ?plan= URL
 * query parameter, the plan selection step should initialise with that plan
 * already selected.
 *
 * Validates: Requirements 4.6
 */
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useRegistration } from '../hooks/useRegistration';

describe('Property 7: URL plan parameter pre-selects plan on load', () => {
  it('initialises plan from ?plan= URL param for any valid plan value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Plan>('starter', 'business', 'pro'),
        async (plan) => {
          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter initialEntries={[`/register?plan=${plan}`]}>
              {children}
            </MemoryRouter>
          );

          const { result } = renderHook(() => useRegistration(), { wrapper });

          expect(result.current.plan).toBe(plan);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('initialises plan to null when no ?plan= param is present', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/register']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useRegistration(), { wrapper });
    expect(result.current.plan).toBeNull();
  });

  it('initialises plan to null for invalid ?plan= param values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s !== 'starter' && s !== 'business' && s !== 'pro'),
        async (invalidPlan) => {
          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter initialEntries={[`/register?plan=${invalidPlan}`]}>
              {children}
            </MemoryRouter>
          );

          const { result } = renderHook(() => useRegistration(), { wrapper });
          expect(result.current.plan).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
