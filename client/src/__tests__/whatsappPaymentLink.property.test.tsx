/**
 * Property 15: WhatsApp payment link contains invoice data
 * For any invoice record with status='unpaid' or 'overdue', the "Pay now"
 * anchor href must start with "https://wa.me/" and the decoded URL must
 * contain the invoice id and amount.
 *
 * **Validates: Requirements 13.2**
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import type { Invoice, Profile } from '../types/index';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      session: null,
      profile: null,
      signOut: vi.fn(),
      _initialized: true,
    })
  ),
}));

vi.mock('../hooks/useAuth');
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PortalInvoicesPage } from '../pages/portal/PortalInvoicesPage';

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);

// ── Arbitraries ───────────────────────────────────────────────────────────────

const unpaidStatusArb = fc.constantFrom<'unpaid' | 'overdue'>('unpaid', 'overdue');

const invoiceArb: fc.Arbitrary<Invoice> = fc.record({
  id: fc.uuid(),
  client_id: fc.uuid(),
  amount: fc.float({ min: 1, max: 99999, noNaN: true }),
  status: unpaidStatusArb,
  due_date: fc
    .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map((d) => d.toISOString()),
  paid_at: fc.constant(null),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

const clientProfileArb: fc.Arbitrary<Profile> = fc.record({
  id: fc.uuid(),
  role: fc.constant('client' as const),
  full_name: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
  phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSupabaseChain(resolvedValue: unknown): any {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'single', 'insert', 'update'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedValue);
  (chain['order'] as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedValue);
  return chain;
}

function setupMocks(profile: Profile, invoices: Invoice[]) {
  mockUseAuth.mockReturnValue({
    session: { user: { id: profile.id } } as never,
    profile,
    signOut: vi.fn(),
    loading: false,
  });

  const clientData = {
    id: 'client-1',
    profile_id: profile.id,
    company_name: 'Test Co',
    domain: 'test.co.zw',
    plan: 'starter',
    mailbox_limit: 5,
    status: 'active',
    domain_registered_at: null,
    next_renewal_date: null,
    notes: null,
    created_at: new Date().toISOString(),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') return makeSupabaseChain({ data: clientData, error: null });
    if (table === 'invoices') return makeSupabaseChain({ data: invoices, error: null });
    return makeSupabaseChain({ data: null, error: null });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 15: WhatsApp payment link contains invoice data', () => {
  it('pay-now href starts with https://wa.me/ for any unpaid/overdue invoice', async () => {
    await fc.assert(
      fc.asyncProperty(clientProfileArb, invoiceArb, async (profile, invoice) => {
        cleanup();
        setupMocks(profile, [invoice]);

        render(
          <MemoryRouter>
            <PortalInvoicesPage />
          </MemoryRouter>
        );

        const btn = await waitFor(() =>
          screen.getByTestId('pay-now-btn') as HTMLAnchorElement
        );

        const href = btn.getAttribute('href') ?? '';
        expect(href).toMatch(/^https:\/\/wa\.me\//);

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it('decoded pay-now href contains the invoice id', async () => {
    await fc.assert(
      fc.asyncProperty(clientProfileArb, invoiceArb, async (profile, invoice) => {
        cleanup();
        setupMocks(profile, [invoice]);

        render(
          <MemoryRouter>
            <PortalInvoicesPage />
          </MemoryRouter>
        );

        const btn = await waitFor(() =>
          screen.getByTestId('pay-now-btn') as HTMLAnchorElement
        );

        const rawHref = btn.getAttribute('href') ?? '';
        const decodedHref = decodeURIComponent(rawHref);

        expect(decodedHref).toContain(invoice.id);

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it('decoded pay-now href contains the invoice amount', async () => {
    await fc.assert(
      fc.asyncProperty(clientProfileArb, invoiceArb, async (profile, invoice) => {
        cleanup();
        setupMocks(profile, [invoice]);

        render(
          <MemoryRouter>
            <PortalInvoicesPage />
          </MemoryRouter>
        );

        const btn = await waitFor(() =>
          screen.getByTestId('pay-now-btn') as HTMLAnchorElement
        );

        const rawHref = btn.getAttribute('href') ?? '';
        const decodedHref = decodeURIComponent(rawHref);

        expect(decodedHref).toContain(String(invoice.amount));

        cleanup();
      }),
      { numRuns: 30 }
    );
  });
});
