/**
 * VoltOps API client.
 *
 * Auth calls go to /api/auth (no auth guard).
 * All admin-panel data calls go to /api/admin (requires Supabase Bearer token +
 * active employee record on the server side).
 *
 * In dev, the Vite proxy forwards /api/* → http://localhost:3000.
 */

import { AUTH_KEY } from './constants';

const AUTH_BASE = '/api/auth';
const ADMIN_BASE = '/api/admin';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(base: string, path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { error: res.statusText };
  }

  if (!res.ok) {
    throw new ApiError(res.status, (body as { error?: string }).error ?? 'İstek başarısız.');
  }

  // Unwrap { data: ... } envelope if present, otherwise return body as-is.
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function auth<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(AUTH_BASE, path, init);
}

function admin<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(ADMIN_BASE, path, init);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    auth<{
      token: string;
      user: { id: number; email: string; firstName: string; lastName: string; role: string };
    }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    auth<{
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      createdAt: string;
    }>('/me'),
};

// ─── Stations ─────────────────────────────────────────────────────────────────

import type {
  MaintenanceRecord,
  Plug,
  PlugStatus,
  Receipt,
  Session,
  Station,
  StationDetail,
  Ticket,
  User,
} from '../types/db.types';

export const stationsApi = {
  list: () => admin<Station[]>('/stations'),
  /** stationCode is the station's primary identifier (e.g. "TR-16-NIL-01"). */
  get: (stationCode: string) => admin<StationDetail>(`/stations/${stationCode}`),
  create: (data: {
    stationCode: string;
    name: string;
    city: string;
    district?: string;
    latitude: number;
    longitude: number;
  }) => admin<Station>('/stations', { method: 'POST', body: JSON.stringify(data) }),
  update: (stationCode: string, data: Partial<Pick<Station, 'name' | 'city' | 'district' | 'latitude' | 'longitude' | 'status'>>) =>
    admin<Station>(`/stations/${stationCode}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Plugs ────────────────────────────────────────────────────────────────────

export const plugsApi = {
  list: () => admin<Plug[]>('/plugs'),
  /** stationCode is the station's primary identifier. */
  byStation: (stationCode: string) => admin<Plug[]>(`/plugs/by-station/${stationCode}`),
  /** plugCode is the plug's primary identifier (e.g. "TR-16-NIL-01-P1"). */
  updateStatus: (plugCode: string, status: PlugStatus) =>
    admin<Plug>(`/plugs/${plugCode}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsApi = {
  list: () => admin<Session[]>('/sessions'),
  start: (plugCode: string) =>
    admin<Session>('/sessions', { method: 'POST', body: JSON.stringify({ plugCode }) }),
  end: (id: number, energyKwh: number) =>
    admin<Session>(`/sessions/${id}/end`, {
      method: 'PATCH',
      body: JSON.stringify({ energyKwh }),
    }),
};

// ─── Receipts ─────────────────────────────────────────────────────────────────

export const receiptsApi = {
  list: () => admin<Receipt[]>('/receipts'),
  /** receiptNo is the receipt's primary identifier (e.g. "R-000001"). */
  get: (receiptNo: string) => admin<Receipt>(`/receipts/${receiptNo}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => admin<User[]>('/users'),
  get: (id: number) => admin<User>(`/users/${id}`),
  create: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }) => admin<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  // Role is intentionally excluded — privilege escalation must go through Supabase/employees.
  update: (id: number, data: { firstName?: string; lastName?: string; phone?: string | null; isActive?: boolean }) =>
    admin<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const maintenanceApi = {
  list: () => admin<MaintenanceRecord[]>('/maintenance'),
  create: (data: {
    stationCode: string;
    plugCode?: string;
    maintenanceType: string;
    description: string;
    scheduledDate: string;
    employeeId?: number;
  }) => admin<MaintenanceRecord>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { status?: string; completedDate?: string; description?: string; employeeId?: number }) =>
    admin<MaintenanceRecord>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const ticketsApi = {
  list: () => admin<Ticket[]>('/tickets'),
  create: (data: {
    title: string;
    description: string;
    priority?: string;
    stationCode?: string;
    sessionId?: number;
  }) => admin<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { status?: string; priority?: string; assignedEmployeeId?: number }) =>
    admin<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
