/**
 * Property 19: Domain search availability result
 * For any valid domain+TLD pair, the availability indicator shown in the UI
 * must match the availability value returned by the API.
 *
 * Validates: Requirements 3.1
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import DomainSearchBar from '../components/landing/DomainSearchBar';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

// Arbitrary: valid domain names (3–20 chars, letters/numbers/hyphens, no leading/trailing hyphen)
const validDomainArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 20);

const tldArb = fc.constantFrom<'.co.zw' | '.com'>('.co.zw', '.com');
const availableArb = fc.boolean();

describe('Property 19: Domain search availability result', () => {
  it('availability indicator matches API response for any valid domain+TLD', async () => {
    await fc.assert(
      fc.asyncProperty(validDomainArb, tldArb, availableArb, async (domain, tld, available) => {

        // For .co.zw we need two mocked responses (parallel .com check)
        if (tld === '.co.zw') {
          mockFetch
            .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available }) } as Response)
            .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available }) } as Response);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true, status: 200, json: () => Promise.resolve({ available }),
          } as Response);
        }

        const user = userEvent.setup();
        render(<DomainSearchBar />);

        await user.clear(screen.getByLabelText('Domain name'));
        await user.type(screen.getByLabelText('Domain name'), domain);
        await user.selectOptions(screen.getByLabelText('TLD'), tld);
        await user.click(screen.getByLabelText('Check availability'));

        if (available) {
          await waitFor(() => {
            expect(screen.getByTestId(`pill-available-${tld}`)).toBeInTheDocument();
          });
        } else {
          await waitFor(() => {
            expect(screen.getByTestId(`pill-taken-${tld}`)).toBeInTheDocument();
          });
        }

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 10 }
    );
  }, 30000);
});
