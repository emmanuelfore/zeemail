/**
 * Unit tests for StepAccount component — ZISPA checklist visibility
 * Validates: Requirements 5.2, 6.2
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import StepAccount from '../components/register/StepAccount';
import type { RegistrationState } from '../hooks/useRegistration';
import type { Plan } from '../types';

afterEach(() => {
  cleanup();
});

function makeState(overrides: Partial<RegistrationState> = {}): RegistrationState {
  return {
    path: 'A',
    domain: 'example.co.zw',
    domainAvailability: 'available',
    plan: 'starter' as Plan,
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    password: '',
    physical_address: '',
    previous_email_provider: null,
    letterhead_ready: false,
    signed_letter_ready: false,
    id_ready: false,
    tc_confirmed: false,
    clientId: null,
    userId: null,
    ...overrides,
  };
}

describe('StepAccount — ZISPA checklist visibility', () => {
  it('renders ZISPA checklist for Path A', () => {
    render(
      <StepAccount
        path="A"
        state={makeState({ path: 'A' })}
        onAccountField={() => {}}
        onZispaField={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByTestId('zispa-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('zispa-letterhead')).toBeInTheDocument();
    expect(screen.getByTestId('zispa-signed-letter')).toBeInTheDocument();
    expect(screen.getByTestId('zispa-id')).toBeInTheDocument();
    expect(screen.getByTestId('zispa-tc')).toBeInTheDocument();
  });

  it('does NOT render ZISPA checklist for Path B', () => {
    render(
      <StepAccount
        path="B"
        state={makeState({ path: 'B' })}
        onAccountField={() => {}}
        onZispaField={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.queryByTestId('zispa-checklist')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zispa-letterhead')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zispa-signed-letter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zispa-id')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zispa-tc')).not.toBeInTheDocument();
  });

  it('renders all common fields for both paths', () => {
    for (const path of ['A', 'B'] as const) {
      render(
        <StepAccount
          path={path}
          state={makeState({ path })}
          onAccountField={() => {}}
          onZispaField={() => {}}
          onNext={() => {}}
        />
      );
      expect(screen.getByTestId('input-full-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-company-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-phone')).toBeInTheDocument();
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('input-password')).toBeInTheDocument();
      expect(screen.getByTestId('input-physical-address')).toBeInTheDocument();
      cleanup();
    }
  });

  it('calls onAccountField when text inputs change', () => {
    const onAccountField = vi.fn();
    render(
      <StepAccount
        path="B"
        state={makeState({ path: 'B' })}
        onAccountField={onAccountField}
        onZispaField={() => {}}
        onNext={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('input-full-name'), { target: { value: 'Jane Doe' } });
    expect(onAccountField).toHaveBeenCalledWith('full_name', 'Jane Doe');
  });

  it('calls onZispaField when a ZISPA checkbox is toggled (Path A)', () => {
    const onZispaField = vi.fn();
    render(
      <StepAccount
        path="A"
        state={makeState({ path: 'A' })}
        onAccountField={() => {}}
        onZispaField={onZispaField}
        onNext={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('zispa-letterhead'));
    expect(onZispaField).toHaveBeenCalledWith('letterhead_ready', true);
  });

  it('shows password validation error when password is too short', () => {
    render(
      <StepAccount
        path="B"
        state={makeState({ path: 'B', password: 'short' })}
        onAccountField={() => {}}
        onZispaField={() => {}}
        onNext={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('btn-next'));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });
});
