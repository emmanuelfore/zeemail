/**
 * Property 5: Invalid JWT returns 401
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * For any arbitrary malformed token string, the auth middleware always
 * returns 401 with code AUTH_REQUIRED or TOKEN_EXPIRED.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

vi.mock('../../lib/supabaseAdmin', () => {
  const mockGetUser = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  return {
    supabaseAdmin: {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    },
  };
});

import { auth } from '../auth';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('Property 5 – invalid JWT always returns 401', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Always simulate an invalid/rejected token
    (supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
  });

  it('any arbitrary token string results in 401 with AUTH_REQUIRED or TOKEN_EXPIRED', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (token) => {
          const req: any = { headers: { authorization: `Bearer ${token}` } };
          const res = makeRes();
          const next = vi.fn();

          await auth(req, res as any, next);

          expect(res.status).toHaveBeenCalledWith(401);
          const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
          expect(['AUTH_REQUIRED', 'TOKEN_EXPIRED']).toContain(body.code);
          expect(next).not.toHaveBeenCalled();

          vi.clearAllMocks();
          // Re-apply mock after clearAllMocks
          (supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          });
        }
      )
    );
  });
});
