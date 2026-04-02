/**
 * Property 33: Registration form debounce
 * For any valid domain string, rapid keystrokes followed by 799ms of idle
 * time must NOT trigger a domain check. Only after 800ms total idle time
 * should the check fire, and it must fire exactly once.
 *
 * Validates: Requirements 27.19
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import RegistrationForm from '../components/landing/RegistrationForm';

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

describe('Property 33: Registration form debounce', () => {
  it('does not trigger fetch before 800ms and triggers exactly once after 800ms', async () => {
    await fc.assert(
      fc.asyncProperty(validDomainArb, async (domain) => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ available: true }),
        } as Response);

        render(<RegistrationForm />);

        const input = screen.getByLabelText('Domain name');

        // Simulate rapid keystrokes by firing change events for each prefix
        // Each change resets the debounce timer
        for (let i = 1; i <= domain.length; i++) {
          act(() => {
            fireEvent.change(input, { target: { value: domain.slice(0, i) } });
          });
        }

        // 799ms — should NOT have triggered
        await act(async () => {
          vi.advanceTimersByTime(799);
        });

        const callsBefore = mockFetch.mock.calls.filter((c) =>
          String(c[0]).includes('/api/domains/check')
        ).length;
        expect(callsBefore).toBe(0);

        // 1ms more (total 800ms idle) — should trigger exactly once
        await act(async () => {
          vi.advanceTimersByTime(1);
        });

        // Allow the async fetch to resolve
        await act(async () => {
          await Promise.resolve();
        });

        const callsAfter = mockFetch.mock.calls.filter((c) =>
          String(c[0]).includes('/api/domains/check')
        ).length;
        expect(callsAfter).toBe(1);

        cleanup();
        mockFetch.mockReset();
      }),
      { numRuns: 15 }
    );
  }, 30000);
});
