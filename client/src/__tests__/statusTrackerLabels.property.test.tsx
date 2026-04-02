// Feature: self-service-onboarding, Property 12: Status_Tracker reflects every valid status with a non-empty label
/**
 * Property 12: Status_Tracker reflects every valid status with a non-empty label
 * For any valid ClientStatus value, the StatusTracker component should render
 * a non-empty human-readable label string for that status step.
 *
 * Validates: Requirements 8.3, 8.4
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import type { ClientStatus } from '../types';

// Mock supabase to avoid real connections in tests
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  },
}));

import StatusTracker, { STATUS_LABELS } from '../components/register/StatusTracker';

const ALL_STATUSES: ClientStatus[] = [
  'active',
  'suspended',
  'pending',
  'pending_payment',
  'pending_domain',
  'pending_dns',
  'pending_mailboxes',
  'pending_mx',
  'provisioning_error',
];

afterEach(() => {
  cleanup();
});

describe('Property 12: Status_Tracker reflects every valid status with a non-empty label', () => {
  it('STATUS_LABELS map has a non-empty string for every valid ClientStatus', () => {
    fc.assert(
      fc.property(fc.constantFrom<ClientStatus>(...ALL_STATUSES), (status) => {
        const label = STATUS_LABELS[status];
        expect(typeof label).toBe('string');
        expect(label.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('StatusTracker renders a non-empty label element for every status in Path A steps', () => {
    const PATH_A_STEPS: ClientStatus[] = [
      'pending_payment',
      'pending_domain',
      'pending_mailboxes',
      'active',
    ];

    fc.assert(
      fc.property(fc.constantFrom<ClientStatus>(...PATH_A_STEPS), (status) => {
        render(
          <StatusTracker clientId="test-id" initialStatus={status} path="A" />
        );

        // Each step in Path A should have a label element
        PATH_A_STEPS.forEach((step) => {
          const labelEl = screen.getByTestId(`status-label-${step}`);
          expect(labelEl).toBeInTheDocument();
          expect(labelEl.textContent?.trim().length).toBeGreaterThan(0);
        });

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('StatusTracker renders a non-empty label element for every status in Path B steps', () => {
    const PATH_B_STEPS: ClientStatus[] = [
      'pending_payment',
      'pending_mailboxes',
      'pending_mx',
      'active',
    ];

    fc.assert(
      fc.property(fc.constantFrom<ClientStatus>(...PATH_B_STEPS), (status) => {
        render(
          <StatusTracker clientId="test-id" initialStatus={status} path="B" />
        );

        PATH_B_STEPS.forEach((step) => {
          const labelEl = screen.getByTestId(`status-label-${step}`);
          expect(labelEl).toBeInTheDocument();
          expect(labelEl.textContent?.trim().length).toBeGreaterThan(0);
        });

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('provisioning_error status renders a non-empty error label', () => {
    fc.assert(
      fc.property(fc.constantFrom<'A' | 'B'>('A', 'B'), (path) => {
        render(
          <StatusTracker clientId="test-id" initialStatus="provisioning_error" path={path} />
        );

        const errorCard = screen.getByTestId('status-error-card');
        expect(errorCard).toBeInTheDocument();
        expect(errorCard.textContent?.trim().length).toBeGreaterThan(0);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});
