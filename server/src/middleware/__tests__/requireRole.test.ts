import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../requireRole';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('requireRole middleware', () => {
  it('admin role on admin route calls next', () => {
    const middleware = requireRole('admin');
    const req: any = { profile: { id: 'user-1', role: 'admin' } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('client role on admin route returns 403 with INSUFFICIENT_ROLE', () => {
    const middleware = requireRole('admin');
    const req: any = { profile: { id: 'user-2', role: 'client' } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
    expect(next).not.toHaveBeenCalled();
  });
});
