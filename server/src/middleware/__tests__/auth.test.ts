import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '../auth';

vi.mock('../../lib/supabaseAdmin', () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockGetUser = vi.fn();

  return {
    supabaseAdmin: {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    },
    __mocks: { mockGetUser, mockFrom, mockSelect, mockEq, mockSingle },
  };
});

import { supabaseAdmin } from '../../lib/supabaseAdmin';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid JWT attaches user and calls next', async () => {
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const fakeProfile = { id: 'user-1', role: 'admin' };

    (supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: fakeProfile, error: null });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res = makeRes();
    const next = vi.fn();

    await auth(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual(fakeUser);
    expect(req.profile).toEqual(fakeProfile);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('missing JWT returns 401 with AUTH_REQUIRED', async () => {
    const req: any = { headers: {} };
    const res = makeRes();
    const next = vi.fn();

    await auth(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('expired JWT returns 401 with TOKEN_EXPIRED', async () => {
    (supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: { message: 'Token is expired' },
    });

    const req: any = { headers: { authorization: 'Bearer expired-token' } };
    const res = makeRes();
    const next = vi.fn();

    await auth(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
    expect(next).not.toHaveBeenCalled();
  });
});
