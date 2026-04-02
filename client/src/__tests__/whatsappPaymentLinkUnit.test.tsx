/**
 * Unit tests for WhatsApp payment link generation in PortalInvoicesPage
 * Validates: Requirements 13.2
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Invoice, Profile } from '../types/index';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../hooks/useAuth');
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PortalInvoicesPage } from '../pages/portal/PortalInvoicesPage';

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);

const profile: Profile = {
  id: 'profile-1',
  role: 'client',
  full_name: 'Test User',
  phone: null,
  created_at: new Date().toISOString(),
};

const clientData = {
  id: 'client-1',
  profile_id: 'profile-1',
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

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-abc123',
    client_id: 'client-1',
    amount: 10.00,
    status: 'unpaid',
    due_date: new Date('2025-06-01').toISOString(),
    paid_at: null,
    description: 'Monthly hosting',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(data: unknown): any {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'single', 'insert', 'update'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data, error: null });
  (chain['order'] as ReturnType<typeof vi.fn>).mockResolvedValue({ data, error: null });
  return chain;
}

function setup(invoices: Invoice[]) {
  mockUseAuth.mockReturnValue({
    session: { user: { id: 'profile-1' } } as never,
    profile,
    signOut: vi.fn(),
    loading: false,
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') return makeChain(clientData);
    if (table === 'invoices') return makeChain(invoices);
    return makeChain(null);
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WhatsApp payment link generation (unit)', () => {
  it('URL base is https://wa.me/', async () => {
    setup([makeInvoice()]);
    render(<MemoryRouter><PortalInvoicesPage /></MemoryRouter>);
    const btn = await waitFor(() => screen.getByTestId('pay-now-btn') as HTMLAnchorElement);
    expect(btn.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
  });

  it('pre-filled message contains invoice amount', async () => {
    setup([makeInvoice({ amount: 42.50 })]);
    render(<MemoryRouter><PortalInvoicesPage /></MemoryRouter>);
    const btn = await waitFor(() => screen.getByTestId('pay-now-btn') as HTMLAnchorElement);
    const decoded = decodeURIComponent(btn.getAttribute('href') ?? '');
    expect(decoded).toContain('42.5');
  });

  it('pre-filled message contains invoice id', async () => {
    setup([makeInvoice({ id: 'inv-test-id-999' })]);
    render(<MemoryRouter><PortalInvoicesPage /></MemoryRouter>);
    const btn = await waitFor(() => screen.getByTestId('pay-now-btn') as HTMLAnchorElement);
    const decoded = decodeURIComponent(btn.getAttribute('href') ?? '');
    expect(decoded).toContain('inv-test-id-999');
  });

  it('pay-now button not shown for paid invoices', async () => {
    setup([makeInvoice({ status: 'paid', paid_at: new Date().toISOString() })]);
    render(<MemoryRouter><PortalInvoicesPage /></MemoryRouter>);
    // Wait for table to render
    await waitFor(() => screen.getByTestId('invoice-row'));
    expect(screen.queryByTestId('pay-now-btn')).toBeNull();
  });
});
