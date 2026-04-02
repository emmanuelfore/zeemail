/**
 * Property 34: WhoisJSON unavailable graceful degradation
 * For any valid domain string, when the domain check endpoint returns 503,
 * the form must show a degradation message and keep the submit button enabled.
 *
 * Validates: Requirements 34
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import RegistrationForm from '../components/landing/RegistrationForm';

const DEGRADATION_MESSAGE =
  "Domain check temporarily unavailable. Submit your details and we'll verify availability for you.";

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

// Valid domain: 3-20 chars, alphanumeric + hyphens, no leading/trailing hyphen
const validDomainArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]$/)
  .filter((s) => s.length >= 3 && s.length <= 20);

describe('Property 34: WhoisJSON unavailable graceful degradation', () => {
  it('shows degradation message and submit button remains enabled on 503', async () => {
    await fc.assert(
      fc.asyncProperty(validDomainArb, async (domain) => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        } as Response);

        render(<RegistrationForm />);

        // Use fireEvent to avoid user-event async issues with fake timers
        act(() => {
          fireEvent.change(screen.getByLabelText('Domain name'), { target: { value: domain } });
        });

        // Advance 800ms to trigger the debounced check
        await act(async () => {
          vi.advanceTimersByTime(800);
        });

        // Allow the async fetch promise to resolve
        await act(async () => {
          await Promise.resolve();
        });

        // Degradation message must be visible
        const degraded = screen.getByTestId('availability-degraded');
        expect(degraded).toBeInTheDocument();
        expect(degraded).toHaveTextContent(DEGRADATION_MESSAGE);

        // Submit button must NOT be disabled
        const submitBtn = screen.getByRole('button', { name: /submit registration/i });
        expect(submitBtn).not.toBeDisabled();

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 15 }
    );
  }, 30000);
});
