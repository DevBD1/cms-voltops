import { MOCK_USERS } from '../mocks/db.mocks';
import type { UserRole } from '../types/db.types';

const AUTH_KEY = 'voltops_auth';

export interface AuthSession {
  email: string;
  userId: string;
  role: UserRole;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSessionFromEmail(email: string): AuthSession | null {
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;

  const session: AuthSession = {
    email: user.email,
    userId: user.id,
    role: user.role,
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
  if (!from || from === '/login') return home;
  if (role === 'CUSTOMER' && from.startsWith('/app')) return from;
  if (role !== 'CUSTOMER' && from.startsWith('/dashboard')) return from;
  return home;
}
