import type { AuthSession, UserRole } from '../types/db.types';
import { authApi } from './api';

const AUTH_KEY = 'voltops_auth';

export type { AuthSession };

/** Read the current session from localStorage. */
export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Authenticate with the real API.
 * Stores the returned token + user in localStorage.
 * Throws ApiError on invalid credentials.
 */
export async function login(email: string, password: string): Promise<AuthSession> {
  const data = await authApi.login(email, password);
  const session: AuthSession = {
    token: data.token,
    user: {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      role: data.user.role as UserRole,
    },
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getPostLoginPath(role: UserRole): string {
  return role === 'CUSTOMER' ? '/app' : '/dashboard';
}

export function resolveRedirect(role: UserRole, from?: string): string {
  const home = getPostLoginPath(role);
  if (!from || from === '/login' || from === '/login/admin') return home;
  if (role === 'CUSTOMER' && from.startsWith('/app')) return from;
  if (role !== 'CUSTOMER' && from.startsWith('/dashboard')) return from;
  return home;
}
