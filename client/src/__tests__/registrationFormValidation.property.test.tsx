// Feature: self-service-onboarding, Property 8: Path A validation rejects incomplete submissions
/**
 * Property 8: Path A validation rejects incomplete submissions
 * For any Path A account creation submission where at least one required field
 * is empty or at least one ZISPA checklist item is unchecked, the form should
 * display at least one inline validation error and not advance to the payment step.
 *
 * Validates: Requirements 5.3, 5.4
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import StepAccount from '../components/register/StepAccount';
import type { RegistrationState } from '../hooks/useRegistration';
import type { Plan } from '../types';

afterEach(() => {
  cleanup();
});

function makeFullState(overrides: Partial<RegistrationState> = {}): RegistrationState {
  return {
    path: 'A',
    domain: 'example.co.zw',
    domainAvailability: 'available',
    plan: 'starter' as Plan,
    full_name: 'Test User',
    company_name: 'Test Corp',
    phone: '+263771234567',
    email: 'test@example.com',
    password: 'password123',
    physical_address: '123 Test Street, Harare',
    previous_email_provider: null,
    letterhead_ready: true,
    signed_letter_ready: true,
    id_ready: true,
    tc_confirmed: true,
    clientId: null,
    userId: null,
    ...overrides,
  };
}

// Arbitrary: a non-empty subset of required text fields to leave empty
const requiredTextFields = [
  'full_name',
  'company_name',
  'phone',
  'email',
  'physical_address',
] as const;

type RequiredTextField = (typeof requiredTextFields)[number];

const zispaFields = [
  'letterhead_ready',
  'signed_letter_ready',
  'id_ready',
  'tc_confirmed',
] as const;

type ZispaField = (typeof zispaFields)[number];

describe('Property 8: Path A validation rejects incomplete submissions', () => {
  it('shows validation error and does not call onNext when a required text field is empty', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<RequiredTextField>(...requiredTextFields),
        (emptyField) => {
          const onNext = vi.fn();
          const state = makeFullState({ [emptyField]: '' });

          render(
            <StepAccount
              path="A"
              state={state}
              onAccountField={() => {}}
              onZispaField={() => {}}
              onNext={onNext}
            />
          );

          fireEvent.click(screen.getByTestId('btn-next'));

          // Must show at least one validation error
          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);

          // Must NOT advance to next step
          expect(onNext).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shows validation error and does not call onNext when a ZISPA item is unchecked', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ZispaField>(...zispaFields),
        (uncheckedField) => {
          const onNext = vi.fn();
          const state = makeFullState({ [uncheckedField]: false });

          render(
            <StepAccount
              path="A"
              state={state}
              onAccountField={() => {}}
              onZispaField={() => {}}
              onNext={onNext}
            />
          );

          fireEvent.click(screen.getByTestId('btn-next'));

          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);
          expect(onNext).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calls onNext when all Path A fields are valid and all ZISPA items are checked', () => {
    const onNext = vi.fn();
    const state = makeFullState();

    render(
      <StepAccount
        path="A"
        state={state}
        onAccountField={() => {}}
        onZispaField={() => {}}
        onNext={onNext}
      />
    );

    fireEvent.click(screen.getByTestId('btn-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

// Feature: self-service-onboarding, Property 10: Password minimum length enforced
/**
 * Property 10: Password minimum length enforced
 * For any password string shorter than 8 characters, the account creation step
 * should display a validation error and prevent progression to payment.
 *
 * Validates: Requirements 5.6, 6.6
 */
describe('Property 10: Password minimum length enforced', () => {
  it('rejects passwords shorter than 8 characters for Path A', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          const onNext = vi.fn();
          const state = makeFullState({ password: shortPassword });

          render(
            <StepAccount
              path="A"
              state={state}
              onAccountField={() => {}}
              onZispaField={() => {}}
              onNext={onNext}
            />
          );

          fireEvent.click(screen.getByTestId('btn-next'));

          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);
          expect(onNext).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects passwords shorter than 8 characters for Path B', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          const onNext = vi.fn();
          const state = makeFullState({ path: 'B', password: shortPassword });

          render(
            <StepAccount
              path="B"
              state={state}
              onAccountField={() => {}}
              onZispaField={() => {}}
              onNext={onNext}
            />
          );

          fireEvent.click(screen.getByTestId('btn-next'));

          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);
          expect(onNext).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts passwords of exactly 8 characters', () => {
    const onNext = vi.fn();
    const state = makeFullState({ password: 'abcd1234' });

    render(
      <StepAccount
        path="A"
        state={state}
        onAccountField={() => {}}
        onZispaField={() => {}}
        onNext={onNext}
      />
    );

    fireEvent.click(screen.getByTestId('btn-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
