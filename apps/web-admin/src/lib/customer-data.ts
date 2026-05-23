import {
  MOCK_INVOICES,
  MOCK_SESSIONS,
  MOCK_STATIONS,
  MOCK_TICKETS,
} from '../mocks/db.mocks';
import type { ChargingSession, Invoice, Station, SupportTicket } from '../types/db.types';

export function getActiveSession(userId: string): ChargingSession | undefined {
  return MOCK_SESSIONS.find((s) => s.userId === userId && s.status === 'ACTIVE');
}

export function getSessionHistory(userId: string): ChargingSession[] {
  return MOCK_SESSIONS.filter(
    (s) => s.userId === userId && (s.status === 'COMPLETED' || s.status === 'FAILED'),
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export function getUserInvoices(userId: string): Invoice[] {
  const sessionIds = new Set(
    MOCK_SESSIONS.filter((s) => s.userId === userId).map((s) => s.id),
  );
  return MOCK_INVOICES.filter((inv) => sessionIds.has(inv.sessionId)).sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
}

export function getActiveStations(): Station[] {
  return MOCK_STATIONS.filter((s) => s.status === 'ACTIVE');
}

export function countAvailableSockets(station: Station): number {
  return station.devices
    .flatMap((d) => d.sockets)
    .filter((s) => s.status === 'AVAILABLE').length;
}

export function getUserTickets(userId: string): SupportTicket[] {
  return MOCK_TICKETS.filter((t) => t.userId === userId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getSessionById(sessionId: string): ChargingSession | undefined {
  return MOCK_SESSIONS.find((s) => s.id === sessionId);
}
