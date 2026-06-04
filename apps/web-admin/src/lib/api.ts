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

function mobile<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>('/api/mobile', path, init);
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
  Employee,
  EmployeeDetail,
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
  update: (stationCode: string, data: Partial<Pick<Station, 'name' | 'city' | 'district'>> & { latitude?: number; longitude?: number }) =>
    admin<Station>(`/stations/${stationCode}`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Change station operational status using raw DB values. */
  setStatus: (stationCode: string, status: 'active' | 'maintenance' | 'offline') =>
    admin<Station>(`/stations/${stationCode}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  /** Permanently delete a station. Returns 409 if plugs or maintenance records exist. */
  delete: (stationCode: string) =>
    admin<{ stationCode: string }>(`/stations/${stationCode}`, { method: 'DELETE' }),
};

// ─── Plugs ────────────────────────────────────────────────────────────────────

/** Maps normalised PlugStatus → raw DB value expected by the API. */
const PLUG_STATUS_RAW: Record<PlugStatus, string> = {
  AVAILABLE: 'available',
  CHARGING: 'in_use',
  FAULTY: 'fault',
  RESERVED: 'offline',
};

export const plugsApi = {
  list: () => admin<Plug[]>('/plugs'),
  /** stationCode is the station's primary identifier. */
  byStation: (stationCode: string) => admin<Plug[]>(`/plugs/by-station/${stationCode}`),
  /** Change plug status (accepts normalised PlugStatus). */
  updateStatus: (plugCode: string, status: PlugStatus) =>
    admin<Plug>(`/plugs/${plugCode}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: PLUG_STATUS_RAW[status] ?? status.toLowerCase() }),
    }),
  /** Change plug status using raw DB values ('available' | 'in_use' | 'fault' | 'offline'). */
  setStatus: (plugCode: string, raw: 'available' | 'in_use' | 'fault' | 'offline') =>
    admin<Plug>(`/plugs/${plugCode}/status`, { method: 'PATCH', body: JSON.stringify({ status: raw }) }),
  /** Add a new plug/socket to a station. */
  create: (data: {
    plugCode: string;
    stationCode: string;
    plugType: string;
    powerKw: number;
  }) => admin<Plug>('/plugs', { method: 'POST', body: JSON.stringify(data) }),
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

// ─── Employees ────────────────────────────────────────────────────────────────

export const employeesApi = {
  /** List all employees — used for assignment dropdowns. */
  list: () => admin<Employee[]>('/employees'),
  /** Get one employee's full detail including their assigned stations, maintenance, and tickets. */
  get: (id: number) => admin<EmployeeDetail>(`/employees/${id}`),
  /** Promote a user to employee/admin or reactivate an inactive employee record. */
  create: (data: {
    userId: number;
    employeeCode: string;
    department: string;
    jobTitle: string;
    hireDate: string;
  }) => admin<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  /** Update an employee's status ('active' | 'inactive'), department, or job title. */
  update: (id: number, data: { status?: string; department?: string; jobTitle?: string }) =>
    admin<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Customer tickets (mobile route — returns only the current user's tickets) ─

export const customerTicketsApi = {
  list: () => mobile<Ticket[]>('/tickets'),
  create: (data: {
    title: string;
    description: string;
    priority?: string;
    stationCode?: string;
  }) => mobile<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
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
