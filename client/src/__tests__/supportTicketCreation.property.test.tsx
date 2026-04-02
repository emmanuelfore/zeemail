/**
 * Property 16: Support ticket creation round-trip
 * For any valid subject+message pair, createTicket must call supabase insert with
 * { client_id, subject, message, status: 'open' } and return true on success.
 *
 * **Validates: Requirements 14.2**
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ToastProvider } from '../components/shared/Toast';
import type { ReactNode } from 'react';

// Mock supabase before importing the hook
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../lib/supabase';
import { useTickets } from '../hooks/useTickets';

const mockFrom = vi.mocked(supabase.from);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSuccessfulMock(insertSpy: ReturnType<typeof vi.fn>): any {
  const orderFn = vi.fn().mockResolvedValue({ data: [], error: null });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn, eq: eqFn });
  return {
    select: selectFn,
    insert: insertSpy,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Property 16: Support ticket creation round-trip', () => {
  it('insert is called with correct fields and returns true for any valid subject+message', async () => {
    const subjectArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
    const messageArb = fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0);
    // Use a fixed UUID format for clientId
    const clientIdArb = fc.uuid();

    await fc.assert(
      fc.asyncProperty(subjectArb, messageArb, clientIdArb, async (subject, message, clientId) => {
        const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
        mockFrom.mockReturnValue(makeSuccessfulMock(insertSpy));

        const { result } = renderHook(() => useTickets(clientId), { wrapper });

        let returnValue: boolean | undefined;
        await act(async () => {
          returnValue = await result.current.createTicket(subject, message);
        });

        // Assert insert was called with the correct payload
        expect(insertSpy).toHaveBeenCalledWith({
          client_id: clientId,
          subject,
          message,
          status: 'open',
        });

        // Assert the returned value is true (success)
        expect(returnValue).toBe(true);

        cleanup();
        vi.clearAllMocks();
      }),
      { numRuns: 20 }
    );
  });
});
