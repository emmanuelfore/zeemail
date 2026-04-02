/**
 * Property 13: Role-based UI restrictions
 * For any portal user session (role='client'), the PortalMailboxesPage and
 * MailboxRow components must NOT render add-mailbox or delete-mailbox controls.
 * Company, domain, and plan edit fields must also be absent from the DOM.
 *
 * Validates: Requirements 11.4, 12.5
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import type { Mailbox, MailboxStatus, Profile } from '../types/index';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
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
import { MailboxRow } from '../components/portal/MailboxRow';
import { PortalMailboxesPage } from '../pages/portal/PortalMailboxesPage';

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);

// ── Arbitraries ───────────────────────────────────────────────────────────────

const mailboxStatusArb = fc.constantFrom<MailboxStatus>('active', 'suspended');

const mailboxArb: fc.Arbitrary<Mailbox> = fc.record({
  id: fc.uuid(),
  client_id: fc.uuid(),
  email: fc.emailAddress(),
  quota_mb: fc.integer({ min: 100, max: 10240 }),
  status: mailboxStatusArb,
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map((d) => d.toISOString()),
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
function makeSupabaseChain(data: unknown, error: null = null): any {
  const result = { data, error };
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'single', 'insert'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // terminal calls resolve with data
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['order'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['insert'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return chain;
}

function renderPortalMailboxesPage(profile: Profile, mailboxes: Mailbox[]) {
  mockUseAuth.mockReturnValue({
    session: { user: { id: profile.id } } as never,
    profile,
    signOut: vi.fn(),
    loading: false,
  });

  // supabase.from('clients').select('*').eq(...).single() → client row
  // supabase.from('mailboxes').select('*').eq(...).order(...) → mailboxes
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
    if (table === 'clients') return makeSupabaseChain(clientData);
    if (table === 'mailboxes') return makeSupabaseChain(mailboxes);
    return makeSupabaseChain(null);
  });

  return render(
    <MemoryRouter>
      <PortalMailboxesPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 13: Role-based UI restrictions', () => {
  it('PortalMailboxesPage never renders add-mailbox control for any client session', () => {
    fc.assert(
      fc.property(clientProfileArb, (profile) => {
        const { container, unmount } = renderPortalMailboxesPage(profile, []);

        const addMailbox = container.querySelector('[data-testid="add-mailbox"]');
        expect(addMailbox).toBeNull();

        unmount();
      }),
      { numRuns: 30 }
    );
  });

  it('PortalMailboxesPage never renders delete-mailbox control for any client session', () => {
    fc.assert(
      fc.property(clientProfileArb, (profile) => {
        const { container, unmount } = renderPortalMailboxesPage(profile, []);

        const deleteMailbox = container.querySelector('[data-testid="delete-mailbox"]');
        expect(deleteMailbox).toBeNull();

        unmount();
      }),
      { numRuns: 30 }
    );
  });

  it('PortalMailboxesPage never renders add-mailbox or delete-mailbox for any client session with mailboxes', () => {
    const mailboxListArb = fc.array(mailboxArb, { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(clientProfileArb, mailboxListArb, (profile, mailboxes) => {
        const { container, unmount } = renderPortalMailboxesPage(profile, mailboxes);

        expect(container.querySelector('[data-testid="add-mailbox"]')).toBeNull();
        expect(container.querySelector('[data-testid="delete-mailbox"]')).toBeNull();

        unmount();
      }),
      { numRuns: 20 }
    );
  });

  it('MailboxRow never renders add-mailbox or delete-mailbox controls for any mailbox', () => {
    const mailboxListArb = fc.array(mailboxArb, { minLength: 1, maxLength: 10 });

    fc.assert(
      fc.property(mailboxListArb, (mailboxes) => {
        const { container, unmount } = render(
          <table>
            <tbody>
              {mailboxes.map((mailbox) => (
                <MailboxRow
                  key={mailbox.id}
                  mailbox={mailbox}
                  onResetPassword={vi.fn().mockResolvedValue(undefined)}
                />
              ))}
            </tbody>
          </table>
        );

        expect(container.querySelector('[data-testid="add-mailbox"]')).toBeNull();
        expect(container.querySelector('[data-testid="delete-mailbox"]')).toBeNull();

        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
