/**
 * Unit tests for ProtectedRoute route guards.
 * Tests: 1.5, 1.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/shared/ProtectedRoute';

// Mock supabase to avoid env var requirement
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

// Mock useAuth hook
vi.mock('../hooks/useAuth');

import { useAuth } from '../hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

function AdminContent() {
  return <div>Admin content</div>;
}

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user on /admin to /login', () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
      signOut: vi.fn(),
      loading: false,
    });

    renderWithRouter('/admin');

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders UnauthorisedPage (403) when client role accesses /admin', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } } as never,
      profile: { id: 'user-1', role: 'client', full_name: null, phone: null, created_at: '' },
      signOut: vi.fn(),
      loading: false,
    });

    renderWithRouter('/admin');

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders admin content when admin role accesses /admin', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } } as never,
      profile: { id: 'user-1', role: 'admin', full_name: null, phone: null, created_at: '' },
      signOut: vi.fn(),
      loading: false,
    });

    renderWithRouter('/admin');

    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
