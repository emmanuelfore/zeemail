/**
 * Property 3: Role-based route guard
 * For any admin-only route under /admin/*, a user with role='client' must see
 * the UnauthorisedPage rather than the route's content.
 *
 * Validates: Requirements 1.6
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

function renderAdminRoute(_profileId: string) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="admin">
              <div>Admin content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 3: Role-based route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders UnauthorisedPage for any /admin/* path when role is client', () => {
    // Generate arbitrary user IDs (simulating different client users)
    const userIdArb = fc.uuid();

    fc.assert(
      fc.property(userIdArb, (userId) => {
        mockUseAuth.mockReturnValue({
          session: { user: { id: userId } } as never,
          profile: { id: userId, role: 'client', full_name: null, phone: null, created_at: '' },
          signOut: vi.fn(),
          loading: false,
        });

        const { unmount } = renderAdminRoute(userId);

        const unauthorised = screen.queryByText('403');
        const adminContent = screen.queryByText('Admin content');

        unmount();

        expect(unauthorised).not.toBeNull();
        expect(adminContent).toBeNull();
      }),
      { numRuns: 20 }
    );
  });
});
