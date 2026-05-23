/**
 * VoltOps API client.
 * Base URL is intentionally empty so the Vite proxy (/api → localhost:3000) handles routing in dev.
 */

const BASE = '/api';

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
    const raw = localStorage.getItem('voltops_auth');
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
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

  return body as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      user: { id: number; email: string; firstName: string; lastName: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      createdAt: string;
    }>('/auth/me'),
};

// ─── Stations ─────────────────────────────────────────────────────────────────

import type { Station, StationDetail, Plug, Session, Receipt, MaintenanceRecord, Ticket, User } from '../types/db.types';

export const stationsApi = {
  list: () => request<Station[]>('/stations'),
  get: (id: number) => request<StationDetail>(`/stations/${id}`),
  create: (data: {
    stationCode: string;
    name: string;
    city: string;
    district?: string;
    address?: string;
    latitude: number;
    longitude: number;
  }) => request<Station>('/stations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Station>) =>
    request<Station>(`/stations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Plugs ────────────────────────────────────────────────────────────────────

export const plugsApi = {
  list: () => request<Plug[]>('/plugs'),
  byStation: (stationId: number) => request<Plug[]>(`/plugs/by-station/${stationId}`),
  updateStatus: (id: number, status: string) =>
    request<Plug>(`/plugs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsApi = {
  list: () => request<Session[]>('/sessions'),
  start: (plugId: number) =>
    request<Session>('/sessions', { method: 'POST', body: JSON.stringify({ plugId }) }),
  end: (id: number, energyKwh: number, totalPrice: number) =>
    request<Session>(`/sessions/${id}/end`, {
      method: 'PATCH',
      body: JSON.stringify({ energyKwh, totalPrice }),
    }),
};

// ─── Receipts ─────────────────────────────────────────────────────────────────

export const receiptsApi = {
  list: () => request<Receipt[]>('/receipts'),
  get: (id: number) => request<Receipt>(`/receipts/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request<User[]>('/users'),
  get: (id: number) => request<User>(`/users/${id}`),
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<User>) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const maintenanceApi = {
  list: () => request<MaintenanceRecord[]>('/maintenance'),
  create: (data: {
    stationId: number;
    plugId?: number;
    description: string;
    maintenanceType?: string;
    scheduledDate?: string;
  }) => request<MaintenanceRecord>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: number,
    data: { status?: string; completedDate?: string; description?: string },
  ) =>
    request<MaintenanceRecord>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const ticketsApi = {
  list: () => request<Ticket[]>('/tickets'),
  create: (data: {
    title: string;
    description: string;
    priority?: string;
    stationId?: number;
  }) => request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: number,
    data: { status?: string; priority?: string; assignedEmployeeId?: number },
  ) =>
    request<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
