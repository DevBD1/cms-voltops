import type { AuthSession, UserRole } from '../types/db.types';
import { authApi, ApiError } from './api';
import { AUTH_KEY } from './constants';

/** Roles that may access the admin/operations panel. */
export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'TECHNICIAN'];

/** Complete set of valid roles; used for runtime validation of server responses. */
const ALL_ROLES: readonly UserRole[] = ['ADMIN', 'OPERATOR', 'TECHNICIAN', 'CUSTOMER'];

export type { AuthSession };

/**
 * Runtime shape guard — rejects tampered or malformed localStorage payloads.
 * Without this, a user could open DevTools, set role to "ADMIN", and bypass
 * ProtectedRoute (the server still enforces via JWT, but the UI shell would expose itself).
 */
function isValidSession(obj: unknown): obj is AuthSession {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  if (typeof s.token !== 'string' || !s.token) return false;
  const u = s.user;
  if (!u || typeof u !== 'object') return false;
  const user = u as Record<string, unknown>;
  return (
    typeof user.id === 'number' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    ALL_ROLES.includes(user.role as UserRole)
  );
}

/** Read the current session from localStorage. Returns null if missing or malformed. */
export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Authenticate with the real API.
 * Stores the returned token + user in localStorage.
 * Throws ApiError on invalid credentials or an unexpected role from the server.
 */
export async function login(email: string, password: string): Promise<AuthSession> {
  const data = await authApi.login(email, password);

  // Validate the role before trusting it — guards against future schema drift
  // or a misconfigured environment returning an unexpected role string.
  if (!ALL_ROLES.includes(data.user.role as UserRole)) {
    throw new ApiError(500, 'Sunucudan geçersiz rol bilgisi alındı.');
  }

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
