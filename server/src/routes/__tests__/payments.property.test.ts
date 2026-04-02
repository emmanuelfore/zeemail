/**
 * Property tests for payment routes
 *
 * Property 11: Payment confirmation triggers correct status transition
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the router
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../../services/paynow', () => ({
  PaynowService: {
    initiatePayment: vi.fn(),
  },
  PaynowUnavailableError: class PaynowUnavailableError extends Error {
    code = 'PAYNOW_UNAVAILABLE';
    constructor(message = 'Paynow gateway unavailable') {
      super(message);
      this.name = 'PaynowUnavailableError';
    }
  },
}));

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import paymentsRouter from '../payments';

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/payments', paymentsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Property 11: Payment confirmation triggers correct status transition
// Feature: self-service-onboarding, Property 11: Payment confirmation triggers correct status transition
// ---------------------------------------------------------------------------

describe('Property 11: Payment confirmation triggers correct status transition', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * For any client in pending_payment status, a confirmed Paynow payment webhook
   * should transition the client to:
   * - pending_domain  if domain_owned = true  (Path A)
   * - pending_mailboxes if domain_owned = false (Path B)
   * and to no other status.
   */
  it('transitions pending_payment client to correct next status based on path', async () => {
    // Feature: self-service-onboarding, Property 11: Payment confirmation triggers correct status transition
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('A' as const, 'B' as const),
        fc.uuid(),
        async (path, clientId) => {
          vi.clearAllMocks();

          const domainOwned = path === 'A';
          const reference = `client-${clientId}-ref`;
          const expectedStatus = domainOwned ? 'pending_domain' : 'pending_mailboxes';

          // Track the update call
          const updateEqMock = vi.fn().mockResolvedValue({ error: null });
          const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

          vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
            if (table === 'clients') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: clientId,
                        domain_owned: domainOwned,
                        status: 'pending_payment',
                      },
                      error: null,
                    }),
                  }),
                }),
                update: updateMock,
              } as ReturnType<typeof supabaseAdmin.from>;
            }
            return { select: vi.fn(), update: vi.fn() } as ReturnType<typeof supabaseAdmin.from>;
          });

          const res = await request(app)
            .post('/api/payments/webhook')
            .send(`reference=${encodeURIComponent(reference)}&status=Paid`)
            .set('Content-Type', 'application/x-www-form-urlencoded');

          expect(res.status).toBe(200);

          // Verify the status was updated to the correct next status
          expect(updateMock).toHaveBeenCalledWith({ status: expectedStatus });
          expect(updateEqMock).toHaveBeenCalledWith('id', clientId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not change status when payment fails', async () => {
    // Feature: self-service-onboarding, Property 11: Payment confirmation triggers correct status transition
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('A' as const, 'B' as const),
        fc.uuid(),
        async (path, clientId) => {
          vi.clearAllMocks();

          const updateMock = vi.fn();

          vi.mocked(supabaseAdmin.from).mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: clientId,
                    domain_owned: path === 'A',
                    status: 'pending_payment',
                  },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          } as ReturnType<typeof supabaseAdmin.from>));

          const reference = `client-${clientId}-ref`;

          const res = await request(app)
            .post('/api/payments/webhook')
            .send(`reference=${encodeURIComponent(reference)}&status=Failed`)
            .set('Content-Type', 'application/x-www-form-urlencoded');

          expect(res.status).toBe(200);
          // No status update should have been called
          expect(updateMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only transitions from pending_payment — ignores already-transitioned clients', async () => {
    // Feature: self-service-onboarding, Property 11: Payment confirmation triggers correct status transition
    const app = buildApp();

    const nonPendingStatuses = [
      'pending_domain', 'pending_mailboxes', 'active', 'pending_mx', 'provisioning_error',
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonPendingStatuses),
        fc.uuid(),
        async (currentStatus, clientId) => {
          vi.clearAllMocks();

          const updateMock = vi.fn();

          vi.mocked(supabaseAdmin.from).mockImplementation(() => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: clientId,
                    domain_owned: false,
                    status: currentStatus,
                  },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          } as ReturnType<typeof supabaseAdmin.from>));

          const reference = `client-${clientId}-ref`;

          const res = await request(app)
            .post('/api/payments/webhook')
            .send(`reference=${encodeURIComponent(reference)}&status=Paid`)
            .set('Content-Type', 'application/x-www-form-urlencoded');

          expect(res.status).toBe(200);
          // Should not update status for already-transitioned clients
          expect(updateMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
