/** Date + time formatter with year (used in session history table). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Date + time formatter without year (used in home view compact rows). */
export function formatShortDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Date-only formatter (used in invoices, support tickets). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Currency formatter in Turkish Lira. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

/** Currency formatter that accepts numeric strings from PostgreSQL. */
export function formatCurrencyStr(amount: string | null | undefined): string {
  if (amount == null) return '—';
  return formatCurrency(parseFloat(amount));
}

/** Numeric string from PostgreSQL → display number (e.g. "120.00" → "120") */
export function formatKwh(kwh: string | null | undefined): string {
  if (kwh == null) return '—';
  const n = parseFloat(kwh);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kWh`;
}

/** Power display: "120.00" → "120 kW" */
export function formatPowerKw(kw: string | number): string {
  const n = typeof kw === 'string' ? parseFloat(kw) : kw;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kW`;
}

import type { PlugType } from '../types/db.types';

const PLUG_TYPE_LABELS: Record<PlugType, string> = {
  AC_TYPE2: 'AC Type 2',
  DC_CCS2: 'DC CCS2',
  DC_CHADEMO: 'DC CHAdeMO',
};

/** Maps a PlugType enum value to a human-readable label. */
export function formatPlugType(type: PlugType): string {
  return PLUG_TYPE_LABELS[type];
}

const ROLE_LABELS_TR: Record<string, string> = {
  ADMIN: 'Yönetici',
  OPERATOR: 'Operatör',
  TECHNICIAN: 'Teknisyen',
  CUSTOMER: 'Müşteri',
};

/** Maps a UserRole string to a Turkish display label. */
export function formatRole(role: string): string {
  return ROLE_LABELS_TR[role] ?? role;
}
