# VoltOps Database Schema

Canonical source: `apps/api/src/db/schema.ts` and generated migrations in `apps/api/drizzle/`.

```mermaid
erDiagram

    %% =========================
    %% IDENTITY
    %% =========================

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
        integer user_id FK
        varchar employee_code UK
        varchar department
        varchar job_title
        date hire_date
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    ADDRESSES {
        integer id PK
        integer user_id FK
        varchar title
        varchar country
        varchar city
        varchar district
        varchar neighborhood "nullable"
        varchar avenue "nullable"
        varchar street "nullable"
        varchar apt_no "nullable"
        varchar apt "nullable"
        varchar door_no "nullable"
        varchar postal_no "nullable"
    }

    %% =========================
    %% VEHICLES
    %% =========================

    VEHICLES {
        varchar plate_number PK
        varchar connector_type
    }

    USER_VEHICLES {
        integer id PK
        integer user_id FK
        varchar vehicle_plate_number FK
        varchar relationship_type
        boolean is_primary
    }

    %% =========================
    %% CHARGING OPERATIONS
    %% =========================

    STATIONS {
        varchar station_code PK
        varchar name
        varchar city
        varchar district
        numeric latitude
        numeric longitude
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    PLUGS {
        varchar plug_code PK
        varchar station_code FK
        varchar plug_type
        numeric power_kw
        varchar current_type
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
        numeric duration_minutes "nullable"
        numeric total_price "nullable"
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    RECEIPTS {
        varchar receipt_no PK
        integer session_id FK
        numeric subtotal
        numeric tax_amount
        numeric total_amount
        varchar currency
        timestamp issued_at
        timestamp created_at
        timestamp updated_at
    }

    %% =========================
    %% SUPPORT & MAINTENANCE
    %% =========================

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

    %% =========================
    %% RELATIONSHIPS
    %% =========================

    USERS ||--o| EMPLOYEES : has_employee_profile
    USERS ||--o{ ADDRESSES : has
    USERS ||--o{ USER_VEHICLES : owns_or_uses
    USERS ||--o{ SESSIONS : starts
    USERS ||--o{ TICKETS : creates

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

- Unique indexes: `users_auth_user_id_unique`, `users_email_unique`, `users_phone_unique`, `employees_employee_code_unique`.
- Composite unique index: `user_vehicles_user_vehicle_unique` on `(user_id, vehicle_plate_number)`.
- Partial unique index: `sessions_active_user_unique` on `user_id` where `status = 'active'`.
- Foreign keys use natural station and plug keys: `station_code`, `plug_code`, and `vehicle_plate_number`.
- `phone`, `password_hash`, `auth_user_id`, `tckn`, `vehicle_plate_number`, `ended_at`, session totals, optional maintenance/ticket assignments, and optional address detail fields are nullable.

## Security Notes

- Row Level Security is enabled on all app tables by migration `0002_pink_iceman.sql`.
- Direct public reads from `stations` and `plugs` are revoked for `anon` and `authenticated`; clients should use the Express API for business data.
