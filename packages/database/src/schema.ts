import {
  bigint,
  bigserial,
  boolean,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'OPERATOR',
  'TECHNICIAN',
  'CUSTOMER',
]);

export const stationStatusEnum = pgEnum('station_status', ['ACTIVE', 'INACTIVE']);

export const plugTypeEnum = pgEnum('plug_type', ['AC_TYPE2', 'DC_CCS2', 'DC_CHADEMO']);

export const currentTypeEnum = pgEnum('current_type', ['AC', 'DC']);

export const plugStatusEnum = pgEnum('plug_status', [
  'AVAILABLE',
  'CHARGING',
  'FAULTY',
  'RESERVED',
]);

export const sessionStatusEnum = pgEnum('session_status', ['ACTIVE', 'COMPLETED', 'FAILED']);

export const paymentMethodEnum = pgEnum('payment_method', ['CREDIT_CARD', 'WALLET']);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
]);

export const ticketStatusEnum = pgEnum('ticket_status', ['OPEN', 'IN_PROGRESS', 'CLOSED']);

export const ticketPriorityEnum = pgEnum('ticket_priority', ['LOW', 'MEDIUM', 'CRITICAL']);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  /** Unique login identifier */
  email: text('email').notNull().unique(),
  phone: text('phone').unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('CUSTOMER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stations = pgTable('stations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  /** Human-readable unique code, e.g. "TR-16-NIL-01" */
  stationCode: text('station_code').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  address: text('address'),
  latitude: numeric('latitude', { precision: 9, scale: 6 }).notNull(),
  longitude: numeric('longitude', { precision: 9, scale: 6 }).notNull(),
  status: stationStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const plugs = pgTable('plugs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  /** Unique code, e.g. "TR-16-NIL-01-P1" */
  plugCode: text('plug_code').notNull().unique(),
  stationId: bigint('station_id', { mode: 'number' })
    .notNull()
    .references(() => stations.id),
  plugType: plugTypeEnum('plug_type').notNull(),
  powerKw: numeric('power_kw', { precision: 6, scale: 2 }).notNull(),
  currentType: currentTypeEnum('current_type').notNull(),
  status: plugStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  plugId: bigint('plug_id', { mode: 'number' })
    .notNull()
    .references(() => plugs.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  energyKwh: numeric('energy_kwh', { precision: 8, scale: 3 }),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }),
  status: sessionStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const receipts = pgTable('receipts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  receiptNo: text('receipt_no').notNull().unique(),
  sessionId: bigint('session_id', { mode: 'number' })
    .notNull()
    .references(() => sessions.id),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('TRY'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const maintenance = pgTable('maintenance', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationId: bigint('station_id', { mode: 'number' })
    .notNull()
    .references(() => stations.id),
  /** Optional: which plug triggered this maintenance */
  plugId: bigint('plug_id', { mode: 'number' }).references(() => plugs.id),
  /** Technician or operator handling the record */
  assignedEmployeeId: bigint('assigned_employee_id', { mode: 'number' }).references(
    () => users.id,
  ),
  maintenanceType: text('maintenance_type'),
  description: text('description').notNull(),
  scheduledDate: date('scheduled_date'),
  completedDate: date('completed_date'),
  status: maintenanceStatusEnum('status').notNull().default('OPEN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  stationId: bigint('station_id', { mode: 'number' }).references(() => stations.id),
  sessionId: bigint('session_id', { mode: 'number' }).references(() => sessions.id),
  assignedEmployeeId: bigint('assigned_employee_id', { mode: 'number' }).references(
    () => users.id,
  ),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: ticketPriorityEnum('priority').notNull().default('MEDIUM'),
  status: ticketStatusEnum('status').notNull().default('OPEN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  tickets: many(tickets),
  maintenanceAssigned: many(maintenance),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  plugs: many(plugs),
  maintenance: many(maintenance),
  tickets: many(tickets),
}));

export const plugsRelations = relations(plugs, ({ one, many }) => ({
  station: one(stations, { fields: [plugs.stationId], references: [stations.id] }),
  sessions: many(sessions),
  maintenance: many(maintenance),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  plug: one(plugs, { fields: [sessions.plugId], references: [plugs.id] }),
  receipt: one(receipts, { fields: [sessions.id], references: [receipts.sessionId] }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  session: one(sessions, { fields: [receipts.sessionId], references: [sessions.id] }),
}));

export const maintenanceRelations = relations(maintenance, ({ one }) => ({
  station: one(stations, { fields: [maintenance.stationId], references: [stations.id] }),
  plug: one(plugs, { fields: [maintenance.plugId], references: [plugs.id] }),
  assignedEmployee: one(users, {
    fields: [maintenance.assignedEmployeeId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  station: one(stations, { fields: [tickets.stationId], references: [stations.id] }),
  session: one(sessions, { fields: [tickets.sessionId], references: [sessions.id] }),
  assignedEmployee: one(users, {
    fields: [tickets.assignedEmployeeId],
    references: [users.id],
    relationName: 'assignedTickets',
  }),
}));
