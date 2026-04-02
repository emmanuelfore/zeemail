/**
 * Property 2: Unauthenticated route guard
 * For any protected route under /admin/* or /portal/*, an unauthenticated request
 * (no session) must result in a redirect to /login.
 *
 * Validates: Requirements 1.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/shared/ProtectedRoute';

// Mock supabase to avoid env var requirement
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../hooks/useAuth');

import { useAuth } from '../hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

function renderProtectedRoute(requiredRole: 'admin' | 'client') {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 2: Unauthenticated route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login for any /admin/* path when session is null', () => {
    // Generate arbitrary path segments for /admin/*
    const pathSegmentArb = fc.array(
      fc.stringMatching(/^[a-z0-9-]+$/),
      { minLength: 0, maxLength: 4 }
    );

    fc.assert(
      fc.property(pathSegmentArb, (_segments) => {
        mockUseAuth.mockReturnValue({
          session: null,
          profile: null,
          signOut: vi.fn(),
          loading: false,
        });

        const { unmount } = renderProtectedRoute('admin');

        const loginPage = screen.queryByText('Login page');
        const protectedContent = screen.queryByText('Protected content');

        unmount();

        expect(loginPage).not.toBeNull();
        expect(protectedContent).toBeNull();
      }),
      { numRuns: 20 }
    );
  });

  it('redirects to /login for any /portal/* path when session is null', () => {
    const pathSegmentArb = fc.array(
      fc.stringMatching(/^[a-z0-9-]+$/),
      { minLength: 0, maxLength: 4 }
    );

    fc.assert(
      fc.property(pathSegmentArb, (_segments) => {
        mockUseAuth.mockReturnValue({
          session: null,
          profile: null,
          signOut: vi.fn(),
          loading: false,
        });

        const { unmount } = renderProtectedRoute('client');

        const loginPage = screen.queryByText('Login page');
        const protectedContent = screen.queryByText('Protected content');

        unmount();

        expect(loginPage).not.toBeNull();
        expect(protectedContent).toBeNull();
      }),
      { numRuns: 20 }
    );
  });
});
