/**
 * Property 10: Invoice Paid Status Round-Trip
 * For any invoice, marking it as paid must result in the invoice's `status`
 * being `'paid'` and `paid_at` being a non-null timestamp when the record is
 * subsequently read.
 *
 * Validates: Requirements 6.10
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import type { Invoice, InvoiceStatus } from '../types/index';

// Mock supabase and api so the module can be imported without env vars
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../store/authStore', () => ({ useAuthStore: { getState: vi.fn(() => ({ session: null })) } }));

import { applyMarkPaid } from '../pages/admin/ClientDetailPage';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const invoiceStatusArb = fc.constantFrom<InvoiceStatus>('unpaid', 'overdue', 'paid');

const invoiceArb: fc.Arbitrary<Invoice> = fc.record({
  id: fc.uuid(),
  client_id: fc.uuid(),
  amount: fc.float({ min: 1, max: 10000, noNaN: true }),
  status: invoiceStatusArb,
  due_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map((d) => d.toISOString()),
  paid_at: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 10: Invoice Paid Status Round-Trip', () => {
  it('marking any invoice as paid results in status="paid" and non-null paid_at', () => {
    fc.assert(
      fc.property(invoiceArb, (invoice) => {
        const result = applyMarkPaid(invoice);

        // status must be 'paid'
        expect(result.status).toBe('paid');

        // paid_at must be non-null
        expect(result.paid_at).not.toBeNull();

        // paid_at must be a valid ISO timestamp
        const parsedDate = new Date(result.paid_at as string);
        expect(isNaN(parsedDate.getTime())).toBe(false);

        // All other fields must be preserved
        expect(result.id).toBe(invoice.id);
        expect(result.client_id).toBe(invoice.client_id);
        expect(result.amount).toBe(invoice.amount);
        expect(result.due_date).toBe(invoice.due_date);
        expect(result.description).toBe(invoice.description);
        expect(result.created_at).toBe(invoice.created_at);
      }),
      { numRuns: 500 }
    );
  });

  it('paid_at timestamp is set to a recent time (within 5 seconds of now)', () => {
    fc.assert(
      fc.property(invoiceArb, (invoice) => {
        const before = Date.now();
        const result = applyMarkPaid(invoice);
        const after = Date.now();

        const paidAtMs = new Date(result.paid_at as string).getTime();
        expect(paidAtMs).toBeGreaterThanOrEqual(before);
        expect(paidAtMs).toBeLessThanOrEqual(after + 5000);
      }),
      { numRuns: 200 }
    );
  });

  it('marking an already-paid invoice as paid is idempotent in status', () => {
    fc.assert(
      fc.property(invoiceArb, (invoice) => {
        const firstPass = applyMarkPaid(invoice);
        const secondPass = applyMarkPaid(firstPass);

        // Status remains 'paid' after double application
        expect(secondPass.status).toBe('paid');
        expect(secondPass.paid_at).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });
});
