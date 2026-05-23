// src/types/db.types.ts

export type UserRole = 'ADMIN' | 'OPERATOR' | 'TECHNICIAN' | 'CUSTOMER';
export type SocketType = 'AC_TYPE2' | 'DC_CCS2' | 'DC_CHADEMO';
export type SocketStatus = 'AVAILABLE' | 'CHARGING' | 'FAULTY' | 'RESERVED';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type StationStatus = 'ACTIVE' | 'INACTIVE';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Socket {
  id: string;
  deviceId: string;
  socketNumber: number;
  type: SocketType;
  powerKw: number;
  status: SocketStatus;
  currentSessionId?: string;
}

export interface Device {
  id: string;
  stationId: string;
  serialNumber: string;
  model: string;
  firmwareVersion: string;
  status: DeviceStatus;
  sockets: Socket[];
}

export interface Station {
  id: string;
  name: string;
  code: string;
  status: StationStatus;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  devices: Device[];
}

export interface ChargingSession {
  id: string;
  socketId: string;
  userId: string;
  userFullName: string; // Kolaylık için ilişkili veriyi ekliyoruz
  stationName: string;   // UI'da hızlı listelemek için
  startTime: string;
  endTime?: string;
  totalKwh: number;
  totalAmount: number;
  status: SessionStatus;
}

export interface Invoice {
  id: string;
  sessionId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  issuedAt: string;
  paymentMethod: 'CREDIT_CARD' | 'WALLET';
}

export interface MaintenanceRecord {
  id: string;
  deviceId: string;
  deviceSerialNumber: string;
  technicianName: string;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userFullName: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: 'LOW' | 'MEDIUM' | 'CRITICAL';
  createdAt: string;
}