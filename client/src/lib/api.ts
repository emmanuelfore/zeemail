import { useAuthStore } from '../store/authStore';
import { ApiError } from '../types/index';

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = useAuthStore.getState().session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(import.meta.env.VITE_API_BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err: ApiError = await response.json();
    throw new Error(err.error || 'Server error');
  }

  return response.json() as Promise<T>;
}
