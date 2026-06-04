// ─── Enum types (reflect main API schema) ─────────────────────────────────────

/**
 * Application-level role derived from the `employees` table.
 * All active employees → ADMIN. Users without an employee record → CUSTOMER.
 */
export type UserRole = 'ADMIN' | 'CUSTOMER';

/**
 * Station operational status (normalised to uppercase by the admin routes).
 * Underlying DB values: 'active' | 'maintenance' | 'offline'
 */
export type StationStatus = 'ACTIVE' | 'INACTIVE';

/** Plug type as stored in the database. */
export type PlugType = string; // e.g. 'AC_TYPE2', 'DC_CCS2', 'DC_CHADEMO'

/** Current type derived from plugType by the API adapter. */
export type CurrentType = 'AC' | 'DC';

/**
 * Plug operational status (normalised to uppercase by the admin routes).
 * Underlying DB values: 'available' | 'in_use' | 'fault' | 'offline'
 */
export type PlugStatus = 'AVAILABLE' | 'CHARGING' | 'FAULTY' | 'RESERVED';

/**
 * Charging session status (normalised to uppercase by the admin routes).
 * Underlying DB values: 'active' | 'completed' | 'failed'
 */
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';

export type MaintenanceStatus = string; // 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type TicketStatus = string;      // 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = string;    // 'low' | 'normal' | 'high' | 'critical'

// Backward-compat aliases (used by StatusBadge.tsx)
/** @deprecated Use PlugStatus */
export type SocketStatus = PlugStatus;
/** @deprecated Use StationStatus */
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

// ─── API response shapes ──────────────────────────────────────────────────────

/** User record from GET /api/admin/users */
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

/**
 * Station list item — GET /api/admin/stations.
 * Primary identifier: stationCode (e.g. "TR-16-NIL-01").
 */
export interface Station {
  stationCode: string;
  name: string;
  city: string;
  district: string;
  /** Returned as string from PostgreSQL numeric column */
  latitude: string;
  longitude: string;
  status: StationStatus;
  createdAt: string;
  updatedAt: string;
  totalPlugs: number;
  faultyPlugs: number;
  availablePlugs: number;
}

/** Station detail with embedded plugs — GET /api/admin/stations/:stationCode */
export interface StationDetail extends Omit<Station, 'totalPlugs' | 'faultyPlugs' | 'availablePlugs'> {
  plugs: Plug[];
}

/**
 * Plug with station context — GET /api/admin/plugs.
 * Primary identifier: plugCode (e.g. "TR-16-NIL-01-P1").
 */
export interface Plug {
  plugCode: string;
  stationCode: string;
  stationName: string;
  city: string;
  plugType: PlugType;
  /** Returned as string from PostgreSQL numeric column */
  powerKw: string;
  currentType: CurrentType;
  status: PlugStatus;
  updatedAt: string;
}

/** Charging session — GET /api/admin/sessions */
export interface Session {
  id: number;
  userId: number;
  userFullName: string;
  plugCode: string;
  plugType: PlugType;
  stationName: string;
  startedAt: string;
  endedAt: string | null;
  /** Numeric as string */
  energyKwh: string | null;
  /** Numeric as string */
  totalPrice: string | null;
  status: SessionStatus;
}

/** Receipt / invoice — GET /api/admin/receipts */
export interface Receipt {
  receiptNo: string;
  sessionId: number;
  plugCode: string | null;
  plugType: PlugType | null;
  stationName: string | null;
  energyKwh: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  issuedAt: string;
}

/** Maintenance record — GET /api/admin/maintenance */
export interface MaintenanceRecord {
  id: number;
  stationCode: string;
  stationName: string | null;
  plugCode: string | null;
  employeeId: number | null;
  technicianName: string | null;
  maintenanceType: string;
  description: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

/** Support ticket — GET /api/admin/tickets */
export interface Ticket {
  id: number;
  userId: number;
  userFullName: string;
  stationCode: string | null;
  stationName: string | null;
  /** ID of the employee assigned to this ticket, or null if unassigned. */
  assignedEmployeeId: number | null;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

/** Employee record — GET /api/admin/employees */
export interface Employee {
  id: number;
  employeeCode: string;
  department: string;
  jobTitle: string;
  status: string;
  fullName: string;
  email: string;
}

/** Employee detail with assignments — GET /api/admin/employees/:id */
export interface EmployeeDetail extends Employee {
  hireDate: string | null;
  assignedStations: {
    stationCode: string;
    stationName: string;
    assignmentRole: string;
    assignedAt: string;
  }[];
  assignedMaintenance: {
    id: number;
    stationCode: string;
    stationName: string | null;
    plugCode: string | null;
    maintenanceType: string;
    description: string;
    status: string;
    scheduledDate: string | null;
    completedDate: string | null;
  }[];
  assignedTickets: {
    id: number;
    title: string;
    status: string;
    priority: string;
    stationName: string | null;
    userFullName: string;
    createdAt: string;
  }[];
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
