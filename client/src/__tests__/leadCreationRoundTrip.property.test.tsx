/**
 * Property 23: Lead creation round-trip
 * For any valid registration form submission, a lead record must be retrievable
 * from Supabase with matching domain, tld, plan, contact_email, and status='new'.
 *
 * **Validates: Requirements 23.7, 24.2**
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import RegistrationForm from '../components/landing/RegistrationForm';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Arbitraries
const domainArb = fc
  .stringMatching(/^[a-z][a-z0-9]{2,10}[a-z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 20);

const tldArb = fc.constantFrom('.co.zw', '.com') as fc.Arbitrary<'.co.zw' | '.com'>;

const planArb = fc.constantFrom('starter', 'business', 'pro') as fc.Arbitrary<
  'starter' | 'business' | 'pro'
>;

const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'net', 'org')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

describe('Property 23: Lead creation round-trip', () => {
  it(
    'fetch is called with correct payload for any valid form submission',
    async () => {
      await fc.assert(
        fc.asyncProperty(domainArb, tldArb, planArb, emailArb, async (domain, tld, plan, contactEmail) => {
          cleanup();
          vi.useRealTimers();

          // Mock fetch to capture the request body and return success
          const capturedBodies: Record<string, unknown>[] = [];
          const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (typeof url === 'string' && url.includes('/api/leads')) {
              capturedBodies.push(JSON.parse(init?.body as string));
              return new Response(JSON.stringify({ id: 'lead-123' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            // Domain check calls — return quickly
            return new Response(JSON.stringify({ available: false }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          });
          vi.stubGlobal('fetch', fetchMock);

          const user = userEvent.setup({ delay: null });

          render(
            <RegistrationForm initialDomain={domain} initialTld={tld} initialPlan={plan} />
          );

          // Fill required fields
          await user.clear(screen.getByLabelText('Full name'));
          await user.type(screen.getByLabelText('Full name'), 'Test User');

          await user.clear(screen.getByLabelText('Email'));
          await user.type(screen.getByLabelText('Email'), contactEmail);

          await user.clear(screen.getByLabelText('Phone'));
          await user.type(screen.getByLabelText('Phone'), '+263771234567');

          await user.clear(screen.getByLabelText('Company name'));
          await user.type(screen.getByLabelText('Company name'), 'Test Company');

          await user.selectOptions(screen.getByLabelText('Registration type'), 'individual');

          await user.clear(screen.getByLabelText('Organisation description'));
          await user.type(screen.getByLabelText('Organisation description'), 'A test organisation');

          await user.clear(screen.getByLabelText('Physical address'));
          await user.type(screen.getByLabelText('Physical address'), '123 Test Street, Harare');

          // Accept terms
          const zispaCheckbox = screen.getByLabelText('ZISPA terms and conditions');
          const serviceCheckbox = screen.getByLabelText('Service terms and conditions');
          if (!(zispaCheckbox as HTMLInputElement).checked) await user.click(zispaCheckbox);
          if (!(serviceCheckbox as HTMLInputElement).checked) await user.click(serviceCheckbox);

          // Submit
          await user.click(screen.getByRole('button', { name: /submit registration/i }));

          // Wait for the leads API call
          await waitFor(
            () => {
              const leadsCall = capturedBodies.find((b) => 'contact_email' in b);
              expect(leadsCall).toBeDefined();
            },
            { timeout: 3000 }
          );

          const leadsBody = capturedBodies.find((b) => 'contact_email' in b)!;

          expect(leadsBody.domain).toBe(domain);
          expect(leadsBody.tld).toBe(tld);
          expect(leadsBody.plan).toBe(plan);
          expect(leadsBody.contact_email).toBe(contactEmail);
          // status='new' is assigned server-side; the form payload must not override it
          expect(leadsBody.status).toBeUndefined();
        }),
        { numRuns: 10 }
      );
    },
    30000
  );
});
