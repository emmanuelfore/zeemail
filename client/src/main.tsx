import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/shared/Toast';

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// On page load, restore existing session without competing with login
supabase.auth.getSession().then(async ({ data: { session } }) => {
  const store = useAuthStore.getState();
  store.setSession(session);

  if (session?.access_token) {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        store.setProfile(await res.json());
      }
    } catch {
      // Network error — profile stays null, ProtectedRoute will redirect to /login
    }
  }

  store.setInitialized();
});

// Handle sign-out and token refresh only — no profile fetch here
supabase.auth.onAuthStateChange((_event, session) => {
  const store = useAuthStore.getState();
  store.setSession(session);
  if (!session) {
    store.setProfile(null);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
