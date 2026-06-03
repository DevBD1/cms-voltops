/**
 * Canonical Drizzle schema — mirrors apps/api/src/db/schema.ts exactly.
 *
 * This file is used by drizzle-kit (packages/database) for migration generation
 * and the drizzle-kit studio UI. The API server imports from apps/api/src/db/schema.ts
 * directly; both files must be kept in sync.
 *
 * DO NOT add role-based enums or password-related fields here — authentication
 * is delegated entirely to Supabase Auth.
 */

import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── Core business tables ─────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    /** Supabase Auth user UUID — set on first authenticated request. */
    authUserId: uuid('auth_user_id'),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    tckn: varchar('tckn', { length: 11 }),
    email: varchar('email', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    /** Nullable — passwords are managed by Supabase Auth, not the application. */
    passwordHash: varchar('password_hash', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    marketingConsent: timestamp('marketing_consent', { withTimezone: true }),
    termsOfService: timestamp('terms_of_service', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    authUserIdx: uniqueIndex('users_auth_user_id_unique').on(table.authUserId),
    emailIdx: uniqueIndex('users_email_unique').on(table.email),
    phoneIdx: uniqueIndex('users_phone_unique').on(table.phone),
  }),
);

export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    employeeCode: varchar('employee_code', { length: 40 }).notNull(),
    department: varchar('department', { length: 100 }).notNull(),
    jobTitle: varchar('job_title', { length: 100 }).notNull(),
    hireDate: date('hire_date').notNull(),
    /** 'active' | 'inactive' | 'terminated' */
    status: varchar('status', { length: 30 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeCodeIdx: uniqueIndex('employees_employee_code_unique').on(table.employeeCode),
    userIdx: index('employees_user_id_idx').on(table.userId),
  }),
);

export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 100 }).notNull(),
    country: varchar('country', { length: 80 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    neighborhood: varchar('neighborhood', { length: 100 }),
    avenue: varchar('avenue', { length: 100 }),
    street: varchar('street', { length: 100 }),
    aptNo: varchar('apt_no', { length: 30 }),
    apt: varchar('apt', { length: 30 }),
    doorNo: varchar('door_no', { length: 30 }),
    postalNo: varchar('postal_no', { length: 30 }),
  },
  (table) => ({
    userIdx: index('addresses_user_id_idx').on(table.userId),
  }),
);

export const vehicles = pgTable('vehicles', {
  plateNumber: varchar('plate_number', { length: 20 }).primaryKey(),
  connectorType: varchar('connector_type', { length: 40 }).notNull(),
});

export const userVehicles = pgTable(
  'user_vehicles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    vehiclePlateNumber: varchar('vehicle_plate_number', { length: 20 })
      .notNull()
      .references(() => vehicles.plateNumber),
    relationshipType: varchar('relationship_type', { length: 40 }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (table) => ({
    userIdx: index('user_vehicles_user_id_idx').on(table.userId),
    vehicleIdx: index('user_vehicles_vehicle_plate_number_idx').on(table.vehiclePlateNumber),
  }),
);

export const stations = pgTable('stations', {
  /** Human-readable unique code, e.g. "TR-16-NIL-01". Acts as primary key. */
  stationCode: varchar('station_code', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 6 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 6 }).notNull(),
  /** 'active' | 'maintenance' | 'offline' */
  status: varchar('status', { length: 30 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const plugs = pgTable(
  'plugs',
  {
    /** Unique code, e.g. "TR-16-NIL-01-P1". Acts as primary key. */
    plugCode: varchar('plug_code', { length: 60 }).primaryKey(),
    stationCode: varchar('station_code', { length: 40 })
      .notNull()
      .references(() => stations.stationCode),
    /** e.g. 'AC_TYPE2', 'DC_CCS2', 'DC_CHADEMO' */
    plugType: varchar('plug_type', { length: 40 }).notNull(),
    powerKw: numeric('power_kw', { precision: 8, scale: 2 }).notNull(),
    currentType: varchar('current_type', { length: 10 }).notNull(),
    /** 'available' | 'in_use' | 'fault' | 'offline' */
    status: varchar('status', { length: 30 }).notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stationIdx: index('plugs_station_code_idx').on(table.stationCode),
  }),
);

export const stationEmployees = pgTable(
  'station_employees',
  {
    id: serial('id').primaryKey(),
    stationCode: varchar('station_code', { length: 40 })
      .notNull()
      .references(() => stations.stationCode),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    assignmentRole: varchar('assignment_role', { length: 80 }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stationIdx: index('station_employees_station_code_idx').on(table.stationCode),
    employeeIdx: index('station_employees_employee_id_idx').on(table.employeeId),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    plugCode: varchar('plug_code', { length: 60 })
      .notNull()
      .references(() => plugs.plugCode),
    vehiclePlateNumber: varchar('vehicle_plate_number', { length: 20 }).references(
      () => vehicles.plateNumber,
    ),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    energyKwh: numeric('energy_kwh', { precision: 10, scale: 3 }),
    durationMinutes: numeric('duration_minutes', { precision: 10, scale: 2 }),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }),
    /** 'active' | 'completed' | 'failed' */
    status: varchar('status', { length: 30 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
    plugIdx: index('sessions_plug_code_idx').on(table.plugCode),
    vehicleIdx: index('sessions_vehicle_plate_number_idx').on(table.vehiclePlateNumber),
  }),
);

export const receipts = pgTable(
  'receipts',
  {
    /** Receipt number as primary key, e.g. "R-000001". */
    receiptNo: varchar('receipt_no', { length: 60 }).primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('TRY'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('receipts_session_id_idx').on(table.sessionId),
  }),
);

export const maintenance = pgTable(
  'maintenance',
  {
    id: serial('id').primaryKey(),
    stationCode: varchar('station_code', { length: 40 })
      .notNull()
      .references(() => stations.stationCode),
    plugCode: varchar('plug_code', { length: 60 }).references(() => plugs.plugCode),
    employeeId: integer('employee_id').references(() => employees.id),
    maintenanceType: varchar('maintenance_type', { length: 80 }).notNull(),
    description: text('description').notNull(),
    scheduledDate: date('scheduled_date').notNull(),
    completedDate: date('completed_date'),
    /** 'scheduled' | 'in_progress' | 'completed' | 'cancelled' */
    status: varchar('status', { length: 30 }).notNull().default('scheduled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stationIdx: index('maintenance_station_code_idx').on(table.stationCode),
    plugIdx: index('maintenance_plug_code_idx').on(table.plugCode),
    employeeIdx: index('maintenance_employee_id_idx').on(table.employeeId),
  }),
);

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    stationCode: varchar('station_code', { length: 40 }).references(() => stations.stationCode),
    sessionId: integer('session_id').references(() => sessions.id),
    assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id),
    title: varchar('title', { length: 150 }).notNull(),
    description: text('description').notNull(),
    /** 'low' | 'normal' | 'high' | 'critical' */
    priority: varchar('priority', { length: 30 }).notNull().default('normal'),
    /** 'open' | 'in_progress' | 'resolved' | 'closed' */
    status: varchar('status', { length: 30 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('tickets_user_id_idx').on(table.userId),
    stationIdx: index('tickets_station_code_idx').on(table.stationCode),
    sessionIdx: index('tickets_session_id_idx').on(table.sessionId),
    assignedEmployeeIdx: index('tickets_assigned_employee_id_idx').on(table.assignedEmployeeId),
  }),
);
