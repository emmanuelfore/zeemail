/**
 * Property 20: Registration form pre-fill from domain search
 * For any domain+TLD pair passed as props, the form inputs must reflect
 * exactly those values.
 *
 * Validates: Requirements 20
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import RegistrationForm from '../components/landing/RegistrationForm';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

// Valid domain label: 3-20 chars, alphanumeric + hyphens
const domainArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 20);

const tldArb = fc.constantFrom('.co.zw', '.com');

describe('Property 20: Registration form pre-fill from domain search', () => {
  it('domain input reflects initialDomain prop and TLD select reflects initialTld prop', async () => {
    await fc.assert(
      fc.asyncProperty(domainArb, tldArb, async (domain, tld) => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ available: true }),
        } as Response);

        render(<RegistrationForm initialDomain={domain} initialTld={tld} />);

        const domainInput = screen.getByLabelText('Domain name') as HTMLInputElement;
        expect(domainInput.value).toBe(domain);

        const tldSelect = screen.getByLabelText('TLD') as HTMLSelectElement;
        expect(tldSelect.value).toBe(tld);

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 20 }
    );
  });
});
