/**
 * Property 6: Insufficient role returns 403
 * Validates: Requirements 2.4
 *
 * For any role value that is NOT 'admin', requireRole('admin') always
 * returns 403 with code INSUFFICIENT_ROLE.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { requireRole } from '../requireRole';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

// Arbitrary non-admin role values
const nonAdminRole = fc.oneof(
  fc.constantFrom('client', 'guest', 'user', ''),
  fc.string().filter((s) => s !== 'admin')
);

describe('Property 6 – insufficient role always returns 403', () => {
  it('any non-admin role on an admin-required route returns 403 INSUFFICIENT_ROLE', () => {
    const middleware = requireRole('admin');

    fc.assert(
      fc.property(nonAdminRole, (role) => {
        const req: any = { profile: { id: 'user-1', role } };
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res as any, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
        expect(next).not.toHaveBeenCalled();
      })
    );
  });
});
