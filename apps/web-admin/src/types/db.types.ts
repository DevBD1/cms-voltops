// ─── Enum types (mirror database enums) ──────────────────────────────────────

export type UserRole = 'ADMIN' | 'OPERATOR' | 'TECHNICIAN' | 'CUSTOMER';
export type StationStatus = 'ACTIVE' | 'INACTIVE';
export type PlugType = 'AC_TYPE2' | 'DC_CCS2' | 'DC_CHADEMO';
export type CurrentType = 'AC' | 'DC';
export type PlugStatus = 'AVAILABLE' | 'CHARGING' | 'FAULTY' | 'RESERVED';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type PaymentMethod = 'CREDIT_CARD' | 'WALLET';
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'CRITICAL';

// Backward-compat aliases (used by StatusBadge.tsx)
/** @deprecated Use PlugStatus */
export type SocketStatus = PlugStatus;
/** @deprecated Device table replaced by plug status */
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

// ─── API response shapes ──────────────────────────────────────────────────────
// These match exactly what the Express routes return.

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/** Station list item (from GET /api/stations) */
export interface Station {
  id: number;
  stationCode: string;
  name: string;
  city: string;
  district: string | null;
  address: string | null;
  /** Returned as string from PostgreSQL numeric type */
  latitude: string;
  longitude: string;
  status: StationStatus;
  createdAt: string;
  totalPlugs: number;
  faultyPlugs: number;
  availablePlugs: number;
}

/** Station detail with embedded plugs (from GET /api/stations/:id) */
export interface StationDetail extends Omit<Station, 'totalPlugs' | 'faultyPlugs' | 'availablePlugs'> {
  plugs: Plug[];
}

/** Plug with station context (from GET /api/plugs) */
export interface Plug {
  id: number;
  plugCode: string;
  stationId: number;
  stationName: string;
  stationCode: string;
  city: string;
  plugType: PlugType;
  /** Returned as string from PostgreSQL numeric type */
  powerKw: string;
  currentType: CurrentType;
  status: PlugStatus;
  updatedAt: string;
}

/** Charging session (from GET /api/sessions) */
export interface Session {
  id: number;
  userId: number;
  userFullName: string;
  plugId: number;
  plugCode: string;
  plugType: PlugType;
  stationName: string;
  stationId: number;
  startedAt: string;
  endedAt: string | null;
  /** Numeric as string */
  energyKwh: string | null;
  /** Numeric as string */
  totalPrice: string | null;
  status: SessionStatus;
}

/** Receipt / invoice (from GET /api/receipts) */
export interface Receipt {
  id: number;
  receiptNo: string;
  sessionId: number;
  stationName: string;
  plugCode: string;
  plugType: PlugType;
  energyKwh: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  paymentMethod: PaymentMethod;
  issuedAt: string;
}

/** Maintenance record (from GET /api/maintenance) */
export interface MaintenanceRecord {
  id: number;
  stationId: number;
  stationName: string | null;
  plugId: number | null;
  plugCode: string | null;
  assignedEmployeeId: number | null;
  technicianName: string | null;
  maintenanceType: string | null;
  description: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

/** Support ticket (from GET /api/tickets) */
export interface Ticket {
  id: number;
  userId: number;
  userFullName: string;
  stationId: number | null;
  stationName: string | null;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

/** Stored in localStorage after successful login */
export interface AuthSession {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}
