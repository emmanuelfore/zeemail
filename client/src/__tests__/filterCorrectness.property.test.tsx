/**
 * Property 8: Filter Correctness
 * For any filter value applied to the clients table (search by name/domain,
 * plan filter, status filter), every item displayed must satisfy the filter
 * predicate. No item that fails the predicate may appear in the results.
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 7.2, 8.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Client, Plan, ClientStatus } from '../types/index';

// ── Pure filter logic (mirrors ClientsPage useMemo) ──────────────────────────

function filterClients(
  clients: Client[],
  search: string,
  planFilter: Plan | '',
  statusFilter: ClientStatus | ''
): Client[] {
  const q = search.trim().toLowerCase();
  return clients.filter((c) => {
    const matchesSearch =
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q);
    const matchesPlan = !planFilter || c.plan === planFilter;
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const planArb = fc.constantFrom<Plan>('starter', 'business', 'pro');
const statusArb = fc.constantFrom<ClientStatus>('active', 'suspended', 'pending');

const clientArb: fc.Arbitrary<Client> = fc.record({
  id: fc.uuid(),
  profile_id: fc.option(fc.uuid(), { nil: null }),
  company_name: fc.string({ minLength: 1, maxLength: 40 }),
  domain: fc.stringMatching(/^[a-z]{2,10}\.(co\.zw|com)$/),
  plan: planArb,
  mailbox_limit: fc.integer({ min: 1, max: 20 }),
  status: statusArb,
  domain_registered_at: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
  next_renewal_date: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
  notes: fc.option(fc.string(), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

const clientArrayArb = fc.array(clientArb, { minLength: 0, maxLength: 30 });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 8: Filter Correctness', () => {
  it('every displayed item satisfies the search predicate', () => {
    fc.assert(
      fc.property(
        clientArrayArb,
        fc.string({ maxLength: 20 }),
        (clients, search) => {
          const result = filterClients(clients, search, '', '');
          const q = search.trim().toLowerCase();
          for (const c of result) {
            if (q) {
              const satisfies =
                c.company_name.toLowerCase().includes(q) ||
                c.domain.toLowerCase().includes(q);
              expect(satisfies).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('every displayed item satisfies the plan filter predicate', () => {
    fc.assert(
      fc.property(
        clientArrayArb,
        fc.option(planArb, { nil: '' as Plan | '' }),
        (clients, planFilter) => {
          const result = filterClients(clients, '', planFilter as Plan | '', '');
          for (const c of result) {
            if (planFilter) {
              expect(c.plan).toBe(planFilter);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('every displayed item satisfies the status filter predicate', () => {
    fc.assert(
      fc.property(
        clientArrayArb,
        fc.option(statusArb, { nil: '' as ClientStatus | '' }),
        (clients, statusFilter) => {
          const result = filterClients(clients, '', '', statusFilter as ClientStatus | '');
          for (const c of result) {
            if (statusFilter) {
              expect(c.status).toBe(statusFilter);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('combined filters: every displayed item satisfies all active predicates', () => {
    fc.assert(
      fc.property(
        clientArrayArb,
        fc.string({ maxLength: 15 }),
        fc.option(planArb, { nil: '' as Plan | '' }),
        fc.option(statusArb, { nil: '' as ClientStatus | '' }),
        (clients, search, planFilter, statusFilter) => {
          const result = filterClients(
            clients,
            search,
            planFilter as Plan | '',
            statusFilter as ClientStatus | ''
          );
          const q = search.trim().toLowerCase();
          for (const c of result) {
            if (q) {
              const matchesSearch =
                c.company_name.toLowerCase().includes(q) ||
                c.domain.toLowerCase().includes(q);
              expect(matchesSearch).toBe(true);
            }
            if (planFilter) expect(c.plan).toBe(planFilter);
            if (statusFilter) expect(c.status).toBe(statusFilter);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('no item that fails the predicate appears in results', () => {
    fc.assert(
      fc.property(
        clientArrayArb,
        fc.string({ minLength: 1, maxLength: 15 }),
        (clients, search) => {
          const result = filterClients(clients, search, '', '');
          const q = search.trim().toLowerCase();
          if (!q) return; // empty search shows all — skip
          const excluded = clients.filter(
            (c) =>
              !c.company_name.toLowerCase().includes(q) &&
              !c.domain.toLowerCase().includes(q)
          );
          for (const c of excluded) {
            expect(result).not.toContain(c);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
