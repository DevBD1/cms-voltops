import { sql } from 'drizzle-orm';
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

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    authUserId: uuid('auth_user_id'),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    tckn: varchar('tckn', { length: 11 }),
    email: varchar('email', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    marketingConsent: timestamp('marketing_consent', { withTimezone: true }),
    termsOfService: timestamp('terms_of_service', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
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
    status: varchar('status', { length: 30 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    employeeCodeIdx: uniqueIndex('employees_employee_code_unique').on(
      table.employeeCode,
    ),
    userUniqueIdx: uniqueIndex('employees_user_id_unique').on(table.userId),
    userIdx: index('employees_user_id_idx').on(table.userId),
  }),
);

export const cities = pgTable(
  'cities',
  {
    id: serial('id').primaryKey(),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => ({
    countryNameIdx: uniqueIndex('cities_country_name_unique').on(
      table.countryCode,
      table.name,
    ),
  }),
);

export const districts = pgTable(
  'districts',
  {
    id: serial('id').primaryKey(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => ({
    cityNameIdx: uniqueIndex('districts_city_name_unique').on(
      table.cityId,
      table.name,
    ),
    cityIdx: index('districts_city_id_idx').on(table.cityId),
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
    districtId: integer('district_id')
      .notNull()
      .references(() => districts.id),
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
    districtIdx: index('addresses_district_id_idx').on(table.districtId),
  }),
);

export const connectorTypes = pgTable('connector_types', {
  code: varchar('code', { length: 40 }).primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  currentType: varchar('current_type', { length: 10 }).notNull(),
  vehicleLabel: varchar('vehicle_label', { length: 40 }).notNull(),
});

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: serial('id').primaryKey(),
    connectorTypeCode: varchar('connector_type_code', { length: 40 })
      .notNull()
      .references(() => connectorTypes.code),
    pricePerKwh: numeric('price_per_kwh', {
      precision: 10,
      scale: 4,
    }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('TRY'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
  },
  (table) => ({
    connectorValidFromIdx: uniqueIndex(
      'pricing_rules_connector_valid_from_unique',
    ).on(table.connectorTypeCode, table.validFrom),
    connectorIdx: index('pricing_rules_connector_type_code_idx').on(
      table.connectorTypeCode,
    ),
  }),
);

export const taxRates = pgTable(
  'tax_rates',
  {
    id: serial('id').primaryKey(),
    rate: numeric('rate', { precision: 5, scale: 4 }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
  },
  (table) => ({
    validFromIdx: uniqueIndex('tax_rates_valid_from_unique').on(
      table.validFrom,
    ),
  }),
);

export const vehicles = pgTable('vehicles', {
  plateNumber: varchar('plate_number', { length: 20 }).primaryKey(),
  connectorTypeCode: varchar('connector_type_code', { length: 40 })
    .notNull()
    .references(() => connectorTypes.code),
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
    vehicleIdx: index('user_vehicles_vehicle_plate_number_idx').on(
      table.vehiclePlateNumber,
    ),
    userVehicleIdx: uniqueIndex('user_vehicles_user_vehicle_unique').on(
      table.userId,
      table.vehiclePlateNumber,
    ),
  }),
);

export const stations = pgTable(
  'stations',
  {
    stationCode: varchar('station_code', { length: 40 }).primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    districtId: integer('district_id')
      .notNull()
      .references(() => districts.id),
    latitude: numeric('latitude', { precision: 10, scale: 6 }).notNull(),
    longitude: numeric('longitude', { precision: 10, scale: 6 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    districtIdx: index('stations_district_id_idx').on(table.districtId),
  }),
);

export const plugs = pgTable(
  'plugs',
  {
    plugCode: varchar('plug_code', { length: 60 }).primaryKey(),
    stationCode: varchar('station_code', { length: 40 })
      .notNull()
      .references(() => stations.stationCode),
    connectorTypeCode: varchar('connector_type_code', { length: 40 })
      .notNull()
      .references(() => connectorTypes.code),
    powerKw: numeric('power_kw', { precision: 8, scale: 2 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    stationIdx: index('plugs_station_code_idx').on(table.stationCode),
    connectorIdx: index('plugs_connector_type_code_idx').on(
      table.connectorTypeCode,
    ),
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
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    stationIdx: index('station_employees_station_code_idx').on(
      table.stationCode,
    ),
    employeeIdx: index('station_employees_employee_id_idx').on(
      table.employeeId,
    ),
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
    vehiclePlateNumber: varchar('vehicle_plate_number', {
      length: 20,
    }).references(() => vehicles.plateNumber),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    energyKwh: numeric('energy_kwh', { precision: 10, scale: 3 }),
    status: varchar('status', { length: 30 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
    plugIdx: index('sessions_plug_code_idx').on(table.plugCode),
    vehicleIdx: index('sessions_vehicle_plate_number_idx').on(
      table.vehiclePlateNumber,
    ),
    activeUserIdx: uniqueIndex('sessions_active_user_unique')
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
  }),
);

export const receipts = pgTable(
  'receipts',
  {
    receiptNo: varchar('receipt_no', { length: 60 }).primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id),
    pricingRuleId: integer('pricing_rule_id')
      .notNull()
      .references(() => pricingRules.id),
    taxRateId: integer('tax_rate_id')
      .notNull()
      .references(() => taxRates.id),
    issuedAt: timestamp('issued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionUniqueIdx: uniqueIndex('receipts_session_id_unique').on(
      table.sessionId,
    ),
    sessionIdx: index('receipts_session_id_idx').on(table.sessionId),
    pricingRuleIdx: index('receipts_pricing_rule_id_idx').on(
      table.pricingRuleId,
    ),
    taxRateIdx: index('receipts_tax_rate_id_idx').on(table.taxRateId),
  }),
);

export const maintenance = pgTable(
  'maintenance',
  {
    id: serial('id').primaryKey(),
    stationCode: varchar('station_code', { length: 40 })
      .notNull()
      .references(() => stations.stationCode),
    plugCode: varchar('plug_code', { length: 60 }).references(
      () => plugs.plugCode,
    ),
    employeeId: integer('employee_id').references(() => employees.id),
    maintenanceType: varchar('maintenance_type', { length: 80 }).notNull(),
    description: text('description').notNull(),
    scheduledDate: date('scheduled_date').notNull(),
    completedDate: date('completed_date'),
    status: varchar('status', { length: 30 }).notNull().default('scheduled'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
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
    stationCode: varchar('station_code', { length: 40 }).references(
      () => stations.stationCode,
    ),
    sessionId: integer('session_id').references(() => sessions.id),
    assignedEmployeeId: integer('assigned_employee_id').references(
      () => employees.id,
    ),
    title: varchar('title', { length: 150 }).notNull(),
    description: text('description').notNull(),
    priority: varchar('priority', { length: 30 }).notNull().default('normal'),
    status: varchar('status', { length: 30 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index('tickets_user_id_idx').on(table.userId),
    stationIdx: index('tickets_station_code_idx').on(table.stationCode),
    sessionIdx: index('tickets_session_id_idx').on(table.sessionId),
    assignedEmployeeIdx: index('tickets_assigned_employee_id_idx').on(
      table.assignedEmployeeId,
    ),
  }),
);
