/**
 * Property 31: Parallel .com check for .co.zw searches
 * For any valid domain name searched with .co.zw TLD, both .co.zw and .com
 * results must be present in the DOM.
 *
 * Validates: Requirements 3.2
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import DomainSearchBar from '../components/landing/DomainSearchBar';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  cleanup();
  mockFetch.mockReset();
});

const validDomainArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 20);

const availableArb = fc.boolean();

describe('Property 31: Parallel .com check for .co.zw searches', () => {
  it('shows both .co.zw and .com results when searching with .co.zw TLD', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(validDomainArb, availableArb, availableArb, async (domain, cozwAvailable, comAvailable) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockFetch
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: cozwAvailable }) } as Response)
          .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ available: comAvailable }) } as Response);

        const user = userEvent.setup({ delay: null });
        const { container } = render(<DomainSearchBar />);
        const view = within(container);

        await user.clear(view.getByLabelText('Domain name'));
        await user.type(view.getByLabelText('Domain name'), domain);
        // TLD defaults to .co.zw — no need to change

        await user.click(view.getByLabelText('Check availability'));

        // Both .co.zw and .com result pills must appear
        await waitFor(() => {
          const cozwPill = cozwAvailable
            ? view.queryByTestId('pill-available-.co.zw')
            : view.queryByTestId('pill-taken-.co.zw');
          expect(cozwPill).toBeInTheDocument();
        });

        const comPill = comAvailable
          ? view.queryByTestId('pill-available-.com')
          : view.queryByTestId('pill-taken-.com');
        expect(comPill).toBeInTheDocument();

        // fetch must have been called twice (once per TLD)
        expect(mockFetch).toHaveBeenCalledTimes(2);

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 15 }
    );
  });
});
