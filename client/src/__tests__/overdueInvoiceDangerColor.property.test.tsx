/**
 * Property 18: Overdue Invoice Danger Color
 * For any array of invoices with mixed statuses, every row with status='overdue'
 * must apply the danger color #F87171 to text cells (client name, amount, due date),
 * and non-overdue rows must not use that color.
 *
 * **Validates: Requirements 8.3**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import type { Invoice } from '../types/index';

// Mock supabase and api so the module can be imported without env vars
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../store/authStore', () => ({
  useAuthStore: { getState: vi.fn(() => ({ session: null })) },
}));

import { InvoicesTable } from '../components/admin/InvoicesTable';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const invoiceArb: fc.Arbitrary<Invoice> = fc.record({
  id: fc.uuid(),
  client_id: fc.uuid(),
  amount: fc.float({ min: 1, max: 10000, noNaN: true }),
  status: fc.constantFrom('paid', 'unpaid', 'overdue') as fc.Arbitrary<'paid' | 'unpaid' | 'overdue'>,
  due_date: fc
    .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map((d) => d.toISOString()),
  paid_at: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

// Generate arrays with unique IDs to avoid React key collisions
const uniqueInvoiceArrayArb = fc
  .array(invoiceArb, { minLength: 1, maxLength: 15 })
  .map((invoices) =>
    invoices.map((inv, i) => ({ ...inv, id: `invoice-${i}`, client_id: `client-${i}` }))
  );

// ── Constants ─────────────────────────────────────────────────────────────────

// jsdom normalizes hex colors to rgb() when reading back element.style.color
// #F87171 = rgb(248, 113, 113)
const DANGER_COLOR_HEX = '#F87171';
const DANGER_COLOR_RGB = 'rgb(248, 113, 113)';

function isDangerColor(color: string): boolean {
  return color === DANGER_COLOR_HEX || color === DANGER_COLOR_RGB;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildClientNames(invoices: Invoice[]): Record<string, string> {
  const names: Record<string, string> = {};
  invoices.forEach((inv, i) => {
    names[inv.client_id] = `Client ${i}`;
  });
  return names;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 18: Overdue Invoice Danger Color', () => {
  it('every overdue row applies #F87171 to text cells; non-overdue rows do not', () => {
    fc.assert(
      fc.property(uniqueInvoiceArrayArb, (invoices) => {
        const clientNames = buildClientNames(invoices);
        const { container, unmount } = render(
          <InvoicesTable invoices={invoices} clientNames={clientNames} />
        );

        // Scope queries to the rendered container to avoid cross-render pollution
        const rows = container.querySelectorAll('[data-testid="invoice-row"]');
        expect(rows).toHaveLength(invoices.length);

        rows.forEach((row, idx) => {
          const invoice = invoices[idx];
          const cells = row.querySelectorAll('td');
          const clientCell = cells[0] as HTMLElement;
          const amountCell = cells[1] as HTMLElement;
          const dueDateCell = cells[3] as HTMLElement;

          if (invoice.status === 'overdue') {
            expect(isDangerColor(clientCell.style.color)).toBe(true);
            expect(isDangerColor(amountCell.style.color)).toBe(true);
            expect(isDangerColor(dueDateCell.style.color)).toBe(true);
          } else {
            expect(isDangerColor(clientCell.style.color)).toBe(false);
            expect(isDangerColor(amountCell.style.color)).toBe(false);
            expect(isDangerColor(dueDateCell.style.color)).toBe(false);
          }
        });

        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it('overdue rows consistently use danger color regardless of surrounding non-overdue rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 8 }),
        (beforeCount, afterCount) => {
          // Build invoices: some paid, one overdue, some unpaid — all with unique IDs
          const beforeInvoices: Invoice[] = Array.from({ length: beforeCount }, (_, i) => ({
            id: `before-${i}`,
            client_id: `before-client-${i}`,
            amount: 10 + i,
            status: 'paid' as const,
            due_date: new Date('2023-06-01').toISOString(),
            paid_at: new Date('2023-05-01').toISOString(),
            description: null,
            created_at: new Date('2023-01-01').toISOString(),
          }));

          const overdueInvoice: Invoice = {
            id: 'overdue-id',
            client_id: 'overdue-client',
            amount: 99.99,
            status: 'overdue',
            due_date: new Date('2023-01-01').toISOString(),
            paid_at: null,
            description: null,
            created_at: new Date('2023-01-01').toISOString(),
          };

          const afterInvoices: Invoice[] = Array.from({ length: afterCount }, (_, i) => ({
            id: `after-${i}`,
            client_id: `after-client-${i}`,
            amount: 20 + i,
            status: 'unpaid' as const,
            due_date: new Date('2024-01-01').toISOString(),
            paid_at: null,
            description: null,
            created_at: new Date('2023-01-01').toISOString(),
          }));

          const invoices = [...beforeInvoices, overdueInvoice, ...afterInvoices];
          const clientNames = buildClientNames(invoices);
          clientNames['overdue-client'] = 'Overdue Client';

          const { container, unmount } = render(
            <InvoicesTable invoices={invoices} clientNames={clientNames} />
          );

          const rows = container.querySelectorAll('[data-testid="invoice-row"]');
          const overdueRowIdx = beforeCount;
          const overdueRow = rows[overdueRowIdx];
          const cells = overdueRow.querySelectorAll('td');

          expect(isDangerColor((cells[0] as HTMLElement).style.color)).toBe(true);
          expect(isDangerColor((cells[1] as HTMLElement).style.color)).toBe(true);
          expect(isDangerColor((cells[3] as HTMLElement).style.color)).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
