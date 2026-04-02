/**
 * Property 27: WhatsApp lead message contains lead data
 * For any lead record with non-null contact_phone, contact_name, domain, and tld,
 * the WhatsApp button href must contain the phone digits, contact name, and domain+tld.
 *
 * **Validates: Requirements 25.6**
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

import { LeadsTable } from '../components/admin/LeadsTable';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const planArb = fc.constantFrom<Plan>('starter', 'business', 'pro');
const tldArb = fc.constantFrom<'.co.zw' | '.com'>('.co.zw', '.com');

// Phone: digits only, optionally with spaces/dashes/plus (non-digit chars will be stripped)
const phoneArb = fc
  .tuple(
    fc.stringMatching(/^[0-9]{7,12}$/),
    fc.array(fc.constantFrom('+', '-', ' '), { minLength: 0, maxLength: 3 })
  )
  .map(([digits, separators]) => {
    // Interleave some separators to make it realistic
    let result = digits;
    for (const sep of separators) {
      const pos = Math.floor(Math.random() * result.length);
      result = result.slice(0, pos) + sep + result.slice(pos);
    }
    return result;
  });

// Contact name: printable ASCII, no leading/trailing whitespace
const nameArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0 && s === s.trim() && !/[\x00-\x1f]/.test(s));

// Domain label: lowercase letters only
const domainArb = fc.stringMatching(/^[a-z]{2,15}$/);

const leadWithContactArb: fc.Arbitrary<Lead> = fc
  .record({
    id: fc.uuid(),
    domain: domainArb,
    tld: tldArb,
    plan: planArb,
    company_name: fc.option(nameArb, { nil: null }),
    registration_type: fc.option(
      fc.constantFrom('company' as const, 'individual' as const, 'ngo' as const),
      { nil: null }
    ),
    business_reg_number: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    org_description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    contact_name: nameArb,
    contact_position: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
    contact_email: fc.option(
      fc.stringMatching(/^[a-zA-Z0-9._%+\-]{1,20}@[a-zA-Z0-9.\-]{1,20}\.[a-zA-Z]{2,4}$/),
      { nil: null }
    ),
    contact_phone: phoneArb,
    physical_address: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    letterhead_ready: fc.option(fc.boolean(), { nil: null }),
    tc_confirmed: fc.option(fc.boolean(), { nil: null }),
    signed_letter_ready: fc.option(fc.boolean(), { nil: null }),
    id_ready: fc.option(fc.boolean(), { nil: null }),
    status: fc.constantFrom('new' as const, 'contacted' as const),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    created_at: fc.date().map((d) => d.toISOString()),
  })
  // Ensure contact_name and contact_phone are non-null (already guaranteed by arbitraries above,
  // but the type allows null so we cast)
  .map((lead) => lead as Lead);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWhatsAppHref(lead: Lead): string {
  const btn = screen.getAllByTestId('whatsapp-btn').find((el) => {
    const href = (el as HTMLAnchorElement).href;
    const phone = (lead.contact_phone ?? '').replace(/\D/g, '');
    return href.includes(phone);
  });
  return btn ? (btn as HTMLAnchorElement).href : '';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 27: WhatsApp lead message contains lead data', () => {
  it('href starts with https://wa.me/ and contains stripped phone digits', async () => {
    await fc.assert(
      fc.asyncProperty(leadWithContactArb, async (lead) => {
        cleanup();

        render(
          <LeadsTable
            leads={[lead]}
            onStatusChange={vi.fn()}
            onConvert={vi.fn()}
          />
        );

        const btn = screen.getByTestId('whatsapp-btn') as HTMLAnchorElement;
        const href = btn.href;

        // Must start with https://wa.me/
        expect(href).toMatch(/^https:\/\/wa\.me\//);

        // Must contain the phone digits (non-digits stripped)
        const digits = (lead.contact_phone ?? '').replace(/\D/g, '');
        expect(href).toContain(digits);

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it('href contains contact_name in the decoded message text', async () => {
    await fc.assert(
      fc.asyncProperty(leadWithContactArb, async (lead) => {
        cleanup();

        render(
          <LeadsTable
            leads={[lead]}
            onStatusChange={vi.fn()}
            onConvert={vi.fn()}
          />
        );

        const btn = screen.getByTestId('whatsapp-btn') as HTMLAnchorElement;
        // Use getAttribute to get the raw href as set by React (not re-encoded by jsdom)
        const rawHref = btn.getAttribute('href') ?? '';

        // Decode the query string to get the plain text message
        const decodedHref = decodeURIComponent(rawHref);

        // The decoded href must contain the contact_name
        expect(decodedHref).toContain(lead.contact_name ?? '');

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it('href contains domain+tld in the decoded message text', async () => {
    await fc.assert(
      fc.asyncProperty(leadWithContactArb, async (lead) => {
        cleanup();

        render(
          <LeadsTable
            leads={[lead]}
            onStatusChange={vi.fn()}
            onConvert={vi.fn()}
          />
        );

        const btn = screen.getByTestId('whatsapp-btn') as HTMLAnchorElement;
        const rawHref = btn.getAttribute('href') ?? '';
        const decodedHref = decodeURIComponent(rawHref);

        // The decoded href must contain the domain+tld
        const fullDomain = `${lead.domain}${lead.tld}`;
        expect(decodedHref).toContain(fullDomain);

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it('no cross-contamination: each lead URL contains only its own data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadWithContactArb, { minLength: 2, maxLength: 5 }),
        async (leads) => {
          // Ensure unique ids
          const uniqueLeads = leads.filter(
            (l, i, arr) => arr.findIndex((x) => x.id === l.id) === i
          );
          if (uniqueLeads.length < 2) return;

          cleanup();

          render(
            <LeadsTable
              leads={uniqueLeads}
              onStatusChange={vi.fn()}
              onConvert={vi.fn()}
            />
          );

          const btns = screen.getAllByTestId('whatsapp-btn') as HTMLAnchorElement[];
          expect(btns).toHaveLength(uniqueLeads.length);

          for (let i = 0; i < uniqueLeads.length; i++) {
            const lead = uniqueLeads[i];
            // Use getAttribute to get the raw href (not re-encoded by jsdom)
            const rawHref = btns[i].getAttribute('href') ?? '';
            const decodedHref = decodeURIComponent(rawHref);

            const ownDigits = (lead.contact_phone ?? '').replace(/\D/g, '');
            const ownName = lead.contact_name ?? '';
            const ownDomain = `${lead.domain}${lead.tld}`;

            // Own data must be present in the decoded href
            expect(rawHref).toContain(ownDigits);
            expect(decodedHref).toContain(ownName);
            expect(decodedHref).toContain(ownDomain);

            // Other leads' phone digits must NOT appear in this URL
            for (let j = 0; j < uniqueLeads.length; j++) {
              if (j === i) continue;
              const otherDigits = (uniqueLeads[j].contact_phone ?? '').replace(/\D/g, '');
              // Only assert non-contamination when digits are distinct
              if (otherDigits !== ownDigits) {
                expect(rawHref).not.toContain(otherDigits);
              }
            }
          }

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});
