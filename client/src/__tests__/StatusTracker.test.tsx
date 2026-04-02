/**
 * Unit tests for StatusTracker component
 * Validates: Requirements 8.2, 8.5
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  },
}));

import StatusTracker from '../components/register/StatusTracker';

afterEach(() => {
  cleanup();
});

describe('StatusTracker — Path A step sequence', () => {
  const PATH_A_STEPS = ['pending_payment', 'pending_domain', 'pending_mailboxes', 'active'];

  it('renders all 4 Path A steps in correct order', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_payment" path="A" />
    );

    const list = screen.getByTestId('status-step-list');
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(4);

    PATH_A_STEPS.forEach((step, i) => {
      expect(items[i]).toHaveAttribute('data-testid', `status-step-${step}`);
    });
  });

  it('does NOT render pending_mx step for Path A', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_payment" path="A" />
    );
    expect(screen.queryByTestId('status-step-pending_mx')).not.toBeInTheDocument();
  });

  it('highlights the current step with aria-current=step', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_domain" path="A" />
    );
    const currentStep = screen.getByTestId('status-step-pending_domain');
    expect(currentStep).toHaveAttribute('aria-current', 'step');
  });

  it('does not mark non-current steps as aria-current', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_domain" path="A" />
    );
    expect(screen.getByTestId('status-step-pending_payment')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('status-step-pending_mailboxes')).not.toHaveAttribute('aria-current');
  });
});

describe('StatusTracker — Path B step sequence', () => {
  const PATH_B_STEPS = ['pending_payment', 'pending_mailboxes', 'pending_mx', 'active'];

  it('renders all 4 Path B steps in correct order', () => {
    render(
      <StatusTracker clientId="xyz" initialStatus="pending_payment" path="B" />
    );

    const list = screen.getByTestId('status-step-list');
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(4);

    PATH_B_STEPS.forEach((step, i) => {
      expect(items[i]).toHaveAttribute('data-testid', `status-step-${step}`);
    });
  });

  it('does NOT render pending_domain step for Path B', () => {
    render(
      <StatusTracker clientId="xyz" initialStatus="pending_payment" path="B" />
    );
    expect(screen.queryByTestId('status-step-pending_domain')).not.toBeInTheDocument();
  });

  it('highlights pending_mx as current step when status is pending_mx', () => {
    render(
      <StatusTracker clientId="xyz" initialStatus="pending_mx" path="B" />
    );
    expect(screen.getByTestId('status-step-pending_mx')).toHaveAttribute('aria-current', 'step');
  });
});

describe('StatusTracker — provisioning_error state', () => {
  it('renders error card instead of step list on provisioning_error', () => {
    render(
      <StatusTracker clientId="err-id" initialStatus="provisioning_error" path="A" />
    );
    expect(screen.getByTestId('status-error-card')).toBeInTheDocument();
    expect(screen.queryByTestId('status-step-list')).not.toBeInTheDocument();
  });

  it('error card has role=alert', () => {
    render(
      <StatusTracker clientId="err-id" initialStatus="provisioning_error" path="A" />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('error card contains a support contact link', () => {
    render(
      <StatusTracker clientId="err-id" initialStatus="provisioning_error" path="B" />
    );
    const link = screen.getByTestId('support-contact-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });

  it('error card displays a non-empty error message', () => {
    render(
      <StatusTracker clientId="err-id" initialStatus="provisioning_error" path="A" />
    );
    const card = screen.getByTestId('status-error-card');
    expect(card.textContent?.trim().length).toBeGreaterThan(0);
  });
});

describe('StatusTracker — step labels', () => {
  it('renders human-readable label for pending_payment', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_payment" path="A" />
    );
    expect(screen.getByTestId('status-label-pending_payment')).toHaveTextContent('Awaiting payment');
  });

  it('renders human-readable label for pending_domain', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="pending_payment" path="A" />
    );
    expect(screen.getByTestId('status-label-pending_domain')).toHaveTextContent('Domain registration');
  });

  it('renders human-readable label for pending_mx', () => {
    render(
      <StatusTracker clientId="xyz" initialStatus="pending_payment" path="B" />
    );
    expect(screen.getByTestId('status-label-pending_mx')).toHaveTextContent('Waiting for DNS propagation');
  });

  it('renders human-readable label for active', () => {
    render(
      <StatusTracker clientId="abc" initialStatus="active" path="A" />
    );
    expect(screen.getByTestId('status-label-active')).toHaveTextContent('Account active');
  });
});
