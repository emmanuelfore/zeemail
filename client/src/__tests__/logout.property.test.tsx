/**
 * Property 4: Logout clears session
 * For any authenticated session, calling signOut must result in the session
 * being null. The session state must not persist after logout.
 *
 * Validates: Requirements 1.7
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { act, renderHook } from '@testing-library/react';

// Mock supabase before importing the store
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

const mockSignOut = vi.mocked(supabase.auth.signOut);

describe('Property 4: Logout clears session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    // Reset store state
    useAuthStore.setState({ session: null, profile: null, _initialized: false });
  });

  it('session is null after signOut for any session object', async () => {
    // Generate arbitrary session-like objects
    const sessionArb = fc.record({
      access_token: fc.string({ minLength: 10, maxLength: 50 }),
      refresh_token: fc.string({ minLength: 10, maxLength: 50 }),
      expires_in: fc.integer({ min: 1, max: 86400 }),
      token_type: fc.constant('bearer'),
      user: fc.record({
        id: fc.uuid(),
        email: fc.emailAddress(),
      }),
    });

    await fc.assert(
      fc.asyncProperty(sessionArb, async (fakeSession) => {
        // Set a session in the store
        act(() => {
          useAuthStore.setState({ session: fakeSession as never, profile: null });
        });

        // Verify session is set
        expect(useAuthStore.getState().session).not.toBeNull();

        // Call signOut
        await act(async () => {
          await useAuthStore.getState().signOut();
        });

        // Session must be null after signOut
        expect(useAuthStore.getState().session).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
      }),
      { numRuns: 20 }
    );
  });

  it('profile is null after signOut regardless of prior profile state', async () => {
    const profileArb = fc.record({
      id: fc.uuid(),
      role: fc.oneof(fc.constant('admin'), fc.constant('client')),
      full_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      phone: fc.option(fc.string({ minLength: 7, maxLength: 15 }), { nil: null }),
      created_at: fc.constant(new Date().toISOString()),
    });

    await fc.assert(
      fc.asyncProperty(profileArb, async (fakeProfile) => {
        act(() => {
          useAuthStore.setState({
            session: { user: { id: fakeProfile.id } } as never,
            profile: fakeProfile as never,
          });
        });

        expect(useAuthStore.getState().profile).not.toBeNull();

        await act(async () => {
          await useAuthStore.getState().signOut();
        });

        expect(useAuthStore.getState().profile).toBeNull();
      }),
      { numRuns: 20 }
    );
  });
});
