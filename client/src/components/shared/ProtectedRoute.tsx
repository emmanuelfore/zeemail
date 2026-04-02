import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UnauthorisedPage } from '../../pages/UnauthorisedPage';
import type { Role } from '../../types';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  requiredRole: Role;
  children: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  // Still initializing — show nothing
  if (loading) return null;

  // Not authenticated
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but profile not loaded yet — wait
  if (!profile) return null;

  // Wrong role
  if (profile.role !== requiredRole) {
    return <UnauthorisedPage />;
  }

  return <>{children}</>;
}
