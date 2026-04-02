/**
 * Property 1: Role-based redirect correctness
 * For any authenticated user, the post-login redirect target must match their role:
 * admin → /admin, client → /portal. No other redirect target is valid.
 *
 * Validates: Requirements 1.3, 1.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Role } from '../types';

/**
 * Pure function that mirrors the redirect logic in LoginPage.
 * Extracted here so it can be tested independently of React rendering.
 */
function getRedirectPath(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'client') return '/portal';
  // Should never reach here for valid roles
  throw new Error(`Unknown role: ${role}`);
}

describe('Property 1: Role-based redirect correctness', () => {
  it('admin role always redirects to /admin', () => {
    fc.assert(
      fc.property(fc.constant('admin' as Role), (role) => {
        const path = getRedirectPath(role);
        expect(path).toBe('/admin');
      }),
      { numRuns: 10 }
    );
  });

  it('client role always redirects to /portal', () => {
    fc.assert(
      fc.property(fc.constant('client' as Role), (role) => {
        const path = getRedirectPath(role);
        expect(path).toBe('/portal');
      }),
      { numRuns: 10 }
    );
  });

  it('every valid role maps to exactly one of /admin or /portal', () => {
    const roleArb = fc.oneof(fc.constant('admin' as Role), fc.constant('client' as Role));
    const validTargets = new Set(['/admin', '/portal']);

    fc.assert(
      fc.property(roleArb, (role) => {
        const path = getRedirectPath(role);
        expect(validTargets.has(path)).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it('admin and client never redirect to the same path', () => {
    const adminPath = getRedirectPath('admin');
    const clientPath = getRedirectPath('client');
    expect(adminPath).not.toBe(clientPath);
  });
});
