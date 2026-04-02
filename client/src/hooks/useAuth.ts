import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const initialized = useAuthStore((s) => s._initialized);

  return { session, profile, signOut, loading: !initialized };
}
