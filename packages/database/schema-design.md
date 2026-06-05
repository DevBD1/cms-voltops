# VoltOps Database Schema

Canonical source: `apps/api/src/db/schema.ts` and generated migrations in `apps/api/drizzle/`.

The physical database is normalized: connector labels, current type, geography, pricing, tax, session duration, and receipt totals are not stored redundantly in operational rows. API services preserve legacy response names by computing or joining those values on read.

```mermaid
erDiagram

    USERS {
        integer id PK
        uuid auth_user_id UK "nullable"
        varchar first_name
        varchar last_name
        varchar tckn "nullable, varchar(11)"
        varchar email UK
        varchar phone UK "nullable"
        varchar password_hash "nullable"
        boolean is_active
        timestamp marketing_consent "nullable"
        timestamp terms_of_service "nullable"
        timestamp created_at
        timestamp updated_at
    }

    EMPLOYEES {
        integer id PK
        integer user_id FK,UK
        varchar employee_code UK
        varchar department
        varchar job_title
        date hire_date
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CITIES {
        integer id PK
        varchar country_code
        varchar name
    }

    DISTRICTS {
        integer id PK
        integer city_id FK
        varchar name
    }

    ADDRESSES {
        integer id PK
        integer user_id FK
        varchar title
        integer district_id FK
        varchar neighborhood "nullable"
        varchar avenue "nullable"
        varchar street "nullable"
        varchar apt_no "nullable"
        varchar apt "nullable"
        varchar door_no "nullable"
        varchar postal_no "nullable"
    }

    CONNECTOR_TYPES {
        varchar code PK
        varchar display_name
        varchar current_type
        varchar vehicle_label
    }

    PRICING_RULES {
        integer id PK
        varchar connector_type_code FK
        numeric price_per_kwh
        varchar currency
        timestamp valid_from
        timestamp valid_to "nullable"
    }

    TAX_RATES {
        integer id PK
        numeric rate
        timestamp valid_from
        timestamp valid_to "nullable"
    }

    VEHICLES {
        varchar plate_number PK
        varchar connector_type_code FK
    }

    USER_VEHICLES {
        integer id PK
        integer user_id FK
        varchar vehicle_plate_number FK
        varchar relationship_type
        boolean is_primary
    }

    STATIONS {
        varchar station_code PK
        varchar name
        integer district_id FK
        numeric latitude
        numeric longitude
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    PLUGS {
        varchar plug_code PK
        varchar station_code FK
        varchar connector_type_code FK
        numeric power_kw
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    STATION_EMPLOYEES {
        integer id PK
        varchar station_code FK
        integer employee_id FK
        varchar assignment_role
        timestamp assigned_at
    }

    SESSIONS {
        integer id PK
        integer user_id FK
        varchar plug_code FK
        varchar vehicle_plate_number FK "nullable"
        timestamp started_at
        timestamp ended_at "nullable"
        numeric energy_kwh "nullable"
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    RECEIPTS {
        varchar receipt_no PK
        integer session_id FK,UK
        integer pricing_rule_id FK
        integer tax_rate_id FK
        timestamp issued_at
        timestamp created_at
        timestamp updated_at
    }

    MAINTENANCE {
        integer id PK
        varchar station_code FK
        varchar plug_code FK "nullable"
        integer employee_id FK "nullable"
        varchar maintenance_type
        text description
        date scheduled_date
        date completed_date "nullable"
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    TICKETS {
        integer id PK
        integer user_id FK
        varchar station_code FK "nullable"
        integer session_id FK "nullable"
        integer assigned_employee_id FK "nullable"
        varchar title
        text description
        varchar priority
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    USERS ||--o| EMPLOYEES : has_employee_profile
    USERS ||--o{ ADDRESSES : has
    USERS ||--o{ USER_VEHICLES : owns_or_uses
    USERS ||--o{ SESSIONS : starts
    USERS ||--o{ TICKETS : creates

    CITIES ||--o{ DISTRICTS : contains
    DISTRICTS ||--o{ ADDRESSES : locates
    DISTRICTS ||--o{ STATIONS : locates

    CONNECTOR_TYPES ||--o{ PLUGS : classifies
    CONNECTOR_TYPES ||--o{ VEHICLES : classifies
    CONNECTOR_TYPES ||--o{ PRICING_RULES : prices

    PRICING_RULES ||--o{ RECEIPTS : determines_price
    TAX_RATES ||--o{ RECEIPTS : determines_tax

    VEHICLES ||--o{ USER_VEHICLES : assigned_to_users
    VEHICLES ||--o{ SESSIONS : used_for

    STATIONS ||--o{ PLUGS : contains
    STATIONS ||--o{ STATION_EMPLOYEES : includes
    STATIONS ||--o{ MAINTENANCE : has
    STATIONS ||--o{ TICKETS : related_to

    PLUGS ||--o{ SESSIONS : used_in
    PLUGS ||--o{ MAINTENANCE : needs

    SESSIONS ||--o| RECEIPTS : generates
    SESSIONS ||--o{ TICKETS : may_cause

    EMPLOYEES ||--o{ STATION_EMPLOYEES : works_at
    EMPLOYEES ||--o{ MAINTENANCE : performs
    EMPLOYEES ||--o{ TICKETS : assigned_to
```

## Canonical Constraints

- Unique indexes: `users_auth_user_id_unique`, `users_email_unique`, `users_phone_unique`, `employees_employee_code_unique`, `employees_user_id_unique`, `receipts_session_id_unique`, `cities_country_name_unique`, `districts_city_name_unique`, `pricing_rules_connector_valid_from_unique`, and `tax_rates_valid_from_unique`.
- Composite unique index: `user_vehicles_user_vehicle_unique` on `(user_id, vehicle_plate_number)`.
- Partial unique index: `sessions_active_user_unique` on `user_id` where `status = 'active'`.
- Foreign keys use natural station, plug, and vehicle keys where those are the table identity: `station_code`, `plug_code`, and `vehicle_plate_number`.
- `connector_types` owns plug API labels (`plugType`, `currentType`) and mobile vehicle labels. `vehicles` and `plugs` store only `connector_type_code`.
- `pricing_rules` and `tax_rates` are time-versioned determinants. `receipts` stores only the chosen `pricing_rule_id` and `tax_rate_id`; `subtotal`, `taxAmount`, `totalAmount`, and `currency` are computed through joins.
- `sessions` stores only event facts. `durationMinutes` is computed from `started_at` and `ended_at`; `totalPrice` is computed from `energy_kwh`, pricing, and tax when a receipt exists.
- `stations` and `addresses` store `district_id`; city, district, and country code are resolved through `districts` and `cities`.
- Nullable columns: `phone`, `password_hash`, `auth_user_id`, `tckn`, `vehicle_plate_number`, `ended_at`, `energy_kwh`, optional maintenance/ticket assignments, pricing/tax `valid_to`, and optional address detail fields.

## Seeded Lookup Rows

- `connector_types`: `AC_TYPE2`, `DC_CCS2`, `DC_CHADEMO`, `DC_GB_T`.
- Initial `pricing_rules`: all connectors at `7.5000 TRY/kWh`, valid from `1970-01-01T00:00:00Z`.
- Initial `tax_rates`: `0.2000`, valid from `1970-01-01T00:00:00Z`.

## Database Interfaces

- Public read views: `view_station_catalog` and `view_connector_pricing`.
- Session lifecycle procedures used by the Express API: `proc_start_session` and `proc_end_session`.
- Trigger functions: `set_updated_at` and `set_employee_code`.
- Timestamp triggers maintain `updated_at` on app tables that expose that column. The employee-code trigger fills `employee_code` as `EMP-XXXX` when omitted.
- Utility scripts:
  - `pnpm --filter @voltops/api db:seed`
  - `pnpm --filter @voltops/api db:reset-seed -- --force`
  - `pnpm --filter @voltops/api db:verify`

## Security Notes

- Row Level Security is enabled on app tables by migration `0002_pink_iceman.sql`.
- Migration `0006_closed_red_skull.sql` enables Row Level Security on `cities`, `districts`, `connector_types`, `pricing_rules`, and `tax_rates`.
- Direct public reads from app tables are revoked for `anon` and `authenticated`; clients should use the Express API for business data.
- `anon` and `authenticated` can select only the two non-sensitive public views. They cannot execute session lifecycle procedures directly.
