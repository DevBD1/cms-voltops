# Database Normalization and Feature Verification

This document summarizes the current canonical Supabase/Postgres database model and gives SQL Editor scripts for checking the required database features.

Run migrations first:

```sh
pnpm --filter @voltops/api db:migrate
```

Optional repository verification:

```sh
pnpm --filter @voltops/api db:verify
```

## Normalization Review

- **1NF:** Compliant. Tables store scalar values in typed columns, and repeating facts are modeled as rows instead of comma-separated fields.
- **2NF:** Compliant. Relationship tables with composite business meaning, such as `user_vehicles`, depend on the full relationship. Most other tables use single-column primary keys.
- **3NF:** Compliant. Derived columns were removed from base tables. Session duration, session total price, receipt subtotal, receipt tax, receipt total, connector current type, and geography names are computed or joined from determinant tables.
- **BCNF:** Compliant for the known business rules. Determinants are represented as primary keys, unique keys, or foreign keys. Examples include user email, employee code, one employee per user, one receipt per session, city/district uniqueness, and one active session per user.
- **4NF:** Compliant. Independent multi-valued facts are split into separate relationship tables, such as `user_vehicles` and `station_employees`.
- **5NF:** No known violation. The schema does not show a lossy join dependency that would require further decomposition. A formal 5NF proof depends on complete business-rule enumeration, but the current app model has no obvious 5NF issue.

## Required Database Features

The project has more than one app-owned database object for each required category:

- **Indexes:** Many regular and unique indexes exist, including user identity indexes, foreign-key indexes, the partial active-session unique index, and receipt/session uniqueness.
- **Views:** `public.view_station_catalog` and `public.view_connector_pricing`.
- **Triggers:** `updated_at` triggers on app tables and `employees_set_employee_code`.
- **Stored procedures:** `public.proc_start_session` and `public.proc_end_session`.

`db:verify` checks the expected views, procedures, triggers, view grants, and seed invariants.

## UI Testability

- **Stored procedures:** Testable from mobile flows. Starting and ending a charge session in the mobile app calls the Express API, and the API calls `proc_start_session` and `proc_end_session`.
- **Triggers:** Partly testable from UI. Admin employee creation without `employeeCode` exercises the employee-code trigger. Admin updates to stations, plugs, employees, maintenance, tickets, users, sessions, or receipts can exercise `updated_at` triggers, although service code may also set `updatedAt`.
- **Views:** Database-testable from Supabase SQL Editor. The current admin and mobile API services still build catalog responses from base-table joins, so these views are not yet meaningfully exercised by UI screens.

## Seed Data

The seed script inserts more than 10 logical test rows. It includes connector types, pricing rules, tax rates, cities, districts, users, vehicles, user-vehicle links, stations, plugs, employees, station assignments, maintenance, and tickets.

Use:

```sh
pnpm --filter @voltops/api db:seed
```

For a destructive reset plus seed, create a manual Supabase backup first:

```sh
pnpm --filter @voltops/api db:reset-seed -- --force
```

## Supabase SQL Editor Tests

The following scripts are designed for Supabase Dashboard > SQL Editor. Scripts that mutate data use `BEGIN` and `ROLLBACK`, so they verify behavior without keeping test rows.

### Test Views

```sql
SELECT *
FROM public.view_station_catalog
ORDER BY station_code
LIMIT 10;

SELECT *
FROM public.view_connector_pricing
ORDER BY connector_type_code;
```

Expected result:

- `view_station_catalog` returns station/geography/plug summary rows.
- `view_connector_pricing` returns connector labels, current pricing, currency, and tax rate rows.

### Test Employee-Code Trigger

```sql
BEGIN;

DO $$
DECLARE
  v_user_id integer;
  v_employee_code text;
BEGIN
  INSERT INTO public.users (
    first_name,
    last_name,
    email,
    phone,
    password_hash,
    is_active,
    terms_of_service
  ) VALUES (
    'Trigger',
    'Tester',
    'trigger.tester.' || extract(epoch from clock_timestamp())::bigint || '@voltops.test',
    '+90555' || lpad((random() * 9999999)::int::text, 7, '0'),
    NULL,
    true,
    now()
  )
  RETURNING id INTO v_user_id;

  INSERT INTO public.employees (
    user_id,
    employee_code,
    department,
    job_title,
    hire_date,
    status
  ) VALUES (
    v_user_id,
    NULL,
    'QA',
    'Trigger Tester',
    current_date,
    'active'
  )
  RETURNING employee_code INTO v_employee_code;

  RAISE NOTICE 'Generated employee_code: %', v_employee_code;

  IF v_employee_code IS NULL OR v_employee_code NOT LIKE 'EMP-%' THEN
    RAISE EXCEPTION 'employee-code trigger did not generate EMP- code';
  END IF;
END $$;

ROLLBACK;
```

Expected result:

- The script completes.
- Supabase shows a notice like `Generated employee_code: EMP-0001`.
- No test user or employee remains because of `ROLLBACK`.

### Test Updated-At Trigger

```sql
BEGIN;

DO $$
DECLARE
  v_before timestamptz;
  v_after timestamptz;
BEGIN
  SELECT updated_at
  INTO v_before
  FROM public.stations
  WHERE station_code = 'ST-IST-KAD-001';

  PERFORM pg_sleep(1);

  UPDATE public.stations
  SET status = status
  WHERE station_code = 'ST-IST-KAD-001'
  RETURNING updated_at INTO v_after;

  RAISE NOTICE 'updated_at before: %, after: %', v_before, v_after;

  IF v_after IS NULL OR v_before IS NULL OR v_after <= v_before THEN
    RAISE EXCEPTION 'updated_at trigger did not advance timestamp';
  END IF;
END $$;

ROLLBACK;
```

Expected result:

- The script completes.
- The notice shows `updated_at` changed to a later timestamp.
- The station row is restored by `ROLLBACK`.

### Test Stored Procedures

This script creates a temporary user and vehicle inside a transaction, starts a session through `proc_start_session`, ends it through `proc_end_session`, checks that a receipt was created, then rolls everything back.

```sql
BEGIN;

DO $$
DECLARE
  v_user_id integer;
  v_session_id integer;
  v_completed_session_id integer;
BEGIN
  UPDATE public.plugs
  SET status = 'available'
  WHERE plug_code = 'PLUG-KAD-001-A';

  INSERT INTO public.users (
    first_name,
    last_name,
    email,
    phone,
    password_hash,
    is_active,
    terms_of_service
  ) VALUES (
    'Procedure',
    'Tester',
    'procedure.tester.' || extract(epoch from clock_timestamp())::bigint || '@voltops.test',
    '+90556' || lpad((random() * 9999999)::int::text, 7, '0'),
    NULL,
    true,
    now()
  )
  RETURNING id INTO v_user_id;

  INSERT INTO public.vehicles (plate_number, connector_type_code)
  VALUES ('34TST999', 'DC_CCS2')
  ON CONFLICT (plate_number) DO UPDATE
  SET connector_type_code = excluded.connector_type_code;

  INSERT INTO public.user_vehicles (
    user_id,
    vehicle_plate_number,
    relationship_type,
    is_primary
  ) VALUES (
    v_user_id,
    '34TST999',
    'owner',
    true
  );

  CALL public.proc_start_session(
    v_user_id,
    'PLUG-KAD-001-A',
    '34TST999',
    v_session_id
  );

  RAISE NOTICE 'Started session id: %', v_session_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = v_session_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'proc_start_session did not create active session';
  END IF;

  CALL public.proc_end_session(
    v_session_id,
    12.5,
    v_user_id,
    v_completed_session_id
  );

  RAISE NOTICE 'Completed session id: %', v_completed_session_id;

  IF v_completed_session_id IS DISTINCT FROM v_session_id THEN
    RAISE EXCEPTION 'proc_end_session returned unexpected session id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = v_session_id
      AND status = 'completed'
      AND energy_kwh = 12.5
  ) THEN
    RAISE EXCEPTION 'proc_end_session did not complete session';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.receipts
    WHERE session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'proc_end_session did not create receipt';
  END IF;
END $$;

ROLLBACK;
```

Expected result:

- The script completes.
- Supabase shows notices for started and completed session IDs.
- No test session, receipt, user, vehicle, or plug-status change remains because of `ROLLBACK`.

### Check Object Counts

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;

SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'PROCEDURE'
ORDER BY routine_name;
```

Expected result:

- More than one index.
- Two views: `view_connector_pricing`, `view_station_catalog`.
- More than one trigger.
- Two procedures: `proc_end_session`, `proc_start_session`.
