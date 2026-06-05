import { sql } from 'drizzle-orm';
import '../env';
import { db, queryClient } from './client';

export async function seedDatabase() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO connector_types (code, display_name, current_type, vehicle_label) VALUES
        ('AC_TYPE2', 'AC Type 2', 'AC', 'Type-2'),
        ('DC_CCS2', 'DC CCS2', 'DC', 'CCS'),
        ('DC_CHADEMO', 'DC CHAdeMO', 'DC', 'CHAdeMO'),
        ('DC_GB_T', 'DC GB/T', 'DC', 'GB/T')
      ON CONFLICT (code) DO UPDATE SET
        display_name = excluded.display_name,
        current_type = excluded.current_type,
        vehicle_label = excluded.vehicle_label
    `);

    await tx.execute(sql`
      INSERT INTO pricing_rules (connector_type_code, price_per_kwh, currency, valid_from, valid_to)
      SELECT code, '7.5000', 'TRY', '1970-01-01T00:00:00Z'::timestamptz, NULL
      FROM connector_types
      ON CONFLICT (connector_type_code, valid_from) DO UPDATE SET
        price_per_kwh = excluded.price_per_kwh,
        currency = excluded.currency,
        valid_to = excluded.valid_to
    `);

    await tx.execute(sql`
      INSERT INTO tax_rates (rate, valid_from, valid_to) VALUES
        ('0.2000', '1970-01-01T00:00:00Z'::timestamptz, NULL)
      ON CONFLICT (valid_from) DO UPDATE SET
        rate = excluded.rate,
        valid_to = excluded.valid_to
    `);

    await tx.execute(sql`
      INSERT INTO cities (country_code, name) VALUES
        ('TR', 'Istanbul'),
        ('TR', 'Ankara')
      ON CONFLICT (country_code, name) DO NOTHING
    `);

    await tx.execute(sql`
      INSERT INTO districts (city_id, name)
      SELECT cities.id, district_name
      FROM (
        VALUES
          ('TR', 'Istanbul', 'Kadikoy'),
          ('TR', 'Istanbul', 'Besiktas'),
          ('TR', 'Ankara', 'Cankaya')
      ) AS seed(country_code, city_name, district_name)
      INNER JOIN cities
        ON cities.country_code = seed.country_code
       AND cities.name = seed.city_name
      ON CONFLICT (city_id, name) DO NOTHING
    `);

    await tx.execute(sql`
      INSERT INTO users (
        first_name,
        last_name,
        tckn,
        email,
        phone,
        password_hash,
        is_active,
        terms_of_service
      ) VALUES
        ('Ada', 'Yilmaz', '10000000001', 'admin@voltops.test', '+905550000001', NULL, true, now()),
        ('Mert', 'Kaya', '10000000002', 'customer@voltops.test', '+905550000002', NULL, true, now()),
        ('Ece', 'Demir', '10000000003', 'ops@voltops.test', '+905550000003', NULL, true, now())
      ON CONFLICT (email) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        tckn = excluded.tckn,
        phone = excluded.phone,
        is_active = excluded.is_active,
        terms_of_service = excluded.terms_of_service,
        updated_at = now()
    `);

    await tx.execute(sql`
      INSERT INTO vehicles (plate_number, connector_type_code) VALUES
        ('34VLT001', 'DC_CCS2'),
        ('34VLT002', 'AC_TYPE2')
      ON CONFLICT (plate_number) DO UPDATE SET
        connector_type_code = excluded.connector_type_code
    `);

    await tx.execute(sql`
      INSERT INTO user_vehicles (
        user_id,
        vehicle_plate_number,
        relationship_type,
        is_primary
      )
      SELECT users.id, vehicle_plate_number, relationship_type, is_primary
      FROM (
        VALUES
          ('customer@voltops.test', '34VLT001', 'owner', true),
          ('ops@voltops.test', '34VLT002', 'owner', true)
      ) AS seed(email, vehicle_plate_number, relationship_type, is_primary)
      INNER JOIN users ON users.email = seed.email
      ON CONFLICT (user_id, vehicle_plate_number) DO UPDATE SET
        relationship_type = excluded.relationship_type,
        is_primary = excluded.is_primary
    `);

    await tx.execute(sql`
      INSERT INTO stations (
        station_code,
        name,
        district_id,
        latitude,
        longitude,
        status
      )
      SELECT station_code, station_name, districts.id, latitude, longitude, status
      FROM (
        VALUES
          ('ST-IST-KAD-001', 'Kadikoy Rapid Hub', 'TR', 'Istanbul', 'Kadikoy', '40.987000', '29.026000', 'active'),
          ('ST-IST-BES-001', 'Besiktas Marina Charge', 'TR', 'Istanbul', 'Besiktas', '41.042000', '29.007000', 'active'),
          ('ST-ANK-CAN-001', 'Cankaya City Charge', 'TR', 'Ankara', 'Cankaya', '39.920000', '32.854000', 'maintenance')
      ) AS seed(station_code, station_name, country_code, city_name, district_name, latitude, longitude, status)
      INNER JOIN cities
        ON cities.country_code = seed.country_code
       AND cities.name = seed.city_name
      INNER JOIN districts
        ON districts.city_id = cities.id
       AND districts.name = seed.district_name
      ON CONFLICT (station_code) DO UPDATE SET
        name = excluded.name,
        district_id = excluded.district_id,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        status = excluded.status,
        updated_at = now()
    `);

    await tx.execute(sql`
      INSERT INTO plugs (
        plug_code,
        station_code,
        connector_type_code,
        power_kw,
        status
      ) VALUES
        ('PLUG-KAD-001-A', 'ST-IST-KAD-001', 'DC_CCS2', '120.00', 'available'),
        ('PLUG-KAD-001-B', 'ST-IST-KAD-001', 'AC_TYPE2', '22.00', 'available'),
        ('PLUG-BES-001-A', 'ST-IST-BES-001', 'DC_CCS2', '180.00', 'available'),
        ('PLUG-CAN-001-A', 'ST-ANK-CAN-001', 'DC_CHADEMO', '50.00', 'offline')
      ON CONFLICT (plug_code) DO UPDATE SET
        station_code = excluded.station_code,
        connector_type_code = excluded.connector_type_code,
        power_kw = excluded.power_kw,
        status = excluded.status,
        updated_at = now()
    `);

    await tx.execute(sql`
      INSERT INTO employees (
        user_id,
        employee_code,
        department,
        job_title,
        hire_date,
        status
      )
      SELECT users.id, employee_code, department, job_title, hire_date::date, status
      FROM (
        VALUES
          ('admin@voltops.test', NULL, 'Operations', 'Administrator', '2026-01-01', 'active'),
          ('ops@voltops.test', 'EMP-OPS1', 'Maintenance', 'Field Technician', '2026-02-01', 'active')
      ) AS seed(email, employee_code, department, job_title, hire_date, status)
      INNER JOIN users ON users.email = seed.email
      ON CONFLICT (user_id) DO UPDATE SET
        department = excluded.department,
        job_title = excluded.job_title,
        hire_date = excluded.hire_date,
        status = excluded.status,
        updated_at = now()
    `);

    await tx.execute(sql`
      INSERT INTO station_employees (
        station_code,
        employee_id,
        assignment_role,
        assigned_at
      )
      SELECT station_code, employees.id, assignment_role, now()
      FROM (
        VALUES
          ('ST-IST-KAD-001', 'ops@voltops.test', 'primary_technician'),
          ('ST-ANK-CAN-001', 'ops@voltops.test', 'maintenance_lead')
      ) AS seed(station_code, email, assignment_role)
      INNER JOIN users ON users.email = seed.email
      INNER JOIN employees ON employees.user_id = users.id
      WHERE NOT EXISTS (
        SELECT 1
        FROM station_employees existing
        WHERE existing.station_code = seed.station_code
          AND existing.employee_id = employees.id
          AND existing.assignment_role = seed.assignment_role
      )
    `);

    await tx.execute(sql`
      INSERT INTO maintenance (
        station_code,
        plug_code,
        employee_id,
        maintenance_type,
        description,
        scheduled_date,
        status
      )
      SELECT
        station_code,
        plug_code,
        employees.id,
        maintenance_type,
        description,
        scheduled_date::date,
        status
      FROM (
        VALUES
          ('ST-ANK-CAN-001', 'PLUG-CAN-001-A', 'ops@voltops.test', 'inspection', 'Routine offline charger inspection', '2026-06-15', 'scheduled')
      ) AS seed(station_code, plug_code, email, maintenance_type, description, scheduled_date, status)
      INNER JOIN users ON users.email = seed.email
      INNER JOIN employees ON employees.user_id = users.id
      WHERE NOT EXISTS (
        SELECT 1
        FROM maintenance existing
        WHERE existing.station_code = seed.station_code
          AND existing.plug_code IS NOT DISTINCT FROM seed.plug_code
          AND existing.description = seed.description
      )
    `);

    await tx.execute(sql`
      INSERT INTO tickets (
        user_id,
        station_code,
        title,
        description,
        priority,
        status
      )
      SELECT
        users.id,
        seed.station_code,
        seed.title,
        seed.description,
        seed.priority,
        seed.status
      FROM (
        VALUES
          ('customer@voltops.test', 'ST-IST-KAD-001', 'Cable latch issue', 'Connector latch felt loose during inspection.', 'normal', 'open')
      ) AS seed(email, station_code, title, description, priority, status)
      INNER JOIN users ON users.email = seed.email
      WHERE NOT EXISTS (
        SELECT 1
        FROM tickets existing
        WHERE existing.user_id = users.id
          AND existing.title = seed.title
          AND existing.description = seed.description
      )
    `);
  });
}

async function main() {
  await seedDatabase();
  console.log('Seed completed.');
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    })
    .finally(() => queryClient.end());
}
