/**
 * Property 25: Convert to client pre-fill
 * For any lead record with status='contacted', clicking the "Convert" button
 * must open the AddClientForm slide-over with fields pre-filled with exactly
 * that lead's data.
 *
 * **Validates: Requirements 25.5**
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import type { Lead, Plan } from '../types/index';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('../hooks/useLeads', () => ({
  useLeads: vi.fn(),
}));

import type { ReactNode } from 'react';
import { useLeads } from '../hooks/useLeads';
import { LeadsPage } from '../pages/admin/LeadsPage';
import { ToastProvider } from '../components/shared/Toast';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const mockUseLeads = vi.mocked(useLeads);

// ── Arbitraries ───────────────────────────────────────────────────────────────

const planArb = fc.constantFrom<Plan>('starter', 'business', 'pro');
const tldArb = fc.constantFrom<'.co.zw' | '.com'>('.co.zw', '.com');

// Non-empty string helpers
const nonEmptyStr = (min = 1, max = 40) =>
  fc.string({ minLength: min, maxLength: max }).filter((s) => s.trim().length > 0 && s === s.trim());

// Email-safe string (no whitespace)
const emailStr = fc.stringMatching(/^[a-zA-Z0-9._%+\-]{1,20}@[a-zA-Z0-9.\-]{1,20}\.[a-zA-Z]{2,4}$/);

const contactedLeadArb: fc.Arbitrary<Lead> = fc.record({
  id: fc.uuid(),
  domain: nonEmptyStr(2, 20),
  tld: tldArb,
  plan: planArb,
  company_name: nonEmptyStr(1, 40),
  registration_type: fc.constantFrom('company' as const, 'individual' as const, 'ngo' as const),
  business_reg_number: fc.option(nonEmptyStr(1, 20), { nil: null }),
  org_description: fc.option(nonEmptyStr(1, 100), { nil: null }),
  contact_name: nonEmptyStr(1, 40),
  contact_position: fc.option(nonEmptyStr(1, 40), { nil: null }),
  contact_email: emailStr,
  contact_phone: nonEmptyStr(7, 20),
  physical_address: fc.option(nonEmptyStr(1, 100), { nil: null }),
  letterhead_ready: fc.option(fc.boolean(), { nil: null }),
  tc_confirmed: fc.option(fc.boolean(), { nil: null }),
  signed_letter_ready: fc.option(fc.boolean(), { nil: null }),
  id_ready: fc.option(fc.boolean(), { nil: null }),
  status: fc.constant('contacted' as const),
  notes: fc.option(nonEmptyStr(1, 200), { nil: null }),
  created_at: fc.date().map((d) => d.toISOString()),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 25: Convert to client pre-fill', () => {
  it('AddClientForm fields are pre-filled with exactly the lead data when Convert is clicked', async () => {
    await fc.assert(
      fc.asyncProperty(contactedLeadArb, async (lead) => {
        cleanup();
        vi.clearAllMocks();

        mockUseLeads.mockReturnValue({
          leads: [lead],
          loading: false,
          updateLeadStatus: vi.fn(),
          refetch: vi.fn(),
        });

        render(<LeadsPage />, { wrapper });

        // Click the Convert button (only one lead rendered, so only one button)
        const convertBtn = screen.getAllByTestId('convert-btn')[0];
        fireEvent.click(convertBtn);

        // The slide-over should now be open with the AddClientForm
        const form = screen.getByTestId('add-client-form');
        expect(form).toBeTruthy();

        // Assert each field is pre-filled with the lead's data
        const expectedDomain = `${lead.domain}${lead.tld}`;
        const domainInput = document.getElementById('domain') as HTMLInputElement;
        expect(domainInput.value).toBe(expectedDomain);

        const companyInput = document.getElementById('company_name') as HTMLInputElement;
        expect(companyInput.value).toBe(lead.company_name);

        const planSelect = document.getElementById('plan') as HTMLSelectElement;
        expect(planSelect.value).toBe(lead.plan);

        const contactNameInput = document.getElementById('contact_name') as HTMLInputElement;
        expect(contactNameInput.value).toBe(lead.contact_name);

        const contactEmailInput = document.getElementById('contact_email') as HTMLInputElement;
        expect(contactEmailInput.value).toBe(lead.contact_email);

        const contactPhoneInput = document.getElementById('contact_phone') as HTMLInputElement;
        expect(contactPhoneInput.value).toBe(lead.contact_phone);

        cleanup();
        vi.clearAllMocks();
      }),
      { numRuns: 30 }
    );
  });
});
