import { sql } from 'drizzle-orm';
import '../env';
import { db, queryClient } from './client';

type CountRow = { count: number | string };
type NameRow = { name: string };

const expectedViews = ['view_connector_pricing', 'view_station_catalog'];
const expectedProcedures = ['proc_end_session', 'proc_start_session'];
const expectedTriggers = [
  'employees_set_employee_code',
  'employees_set_updated_at',
  'maintenance_set_updated_at',
  'plugs_set_updated_at',
  'receipts_set_updated_at',
  'sessions_set_updated_at',
  'stations_set_updated_at',
  'tickets_set_updated_at',
  'users_set_updated_at',
];

function countValue(row: CountRow | undefined) {
  return Number(row?.count ?? 0);
}

function sortedNames(rows: NameRow[]) {
  return rows.map((row) => row.name).sort();
}

function assertEqual(label: string, actual: string[], expected: string[]) {
  const actualValue = actual.join(',');
  const expectedValue = expected.join(',');

  if (actualValue !== expectedValue) {
    throw new Error(
      `${label} mismatch. expected=${expectedValue} actual=${actualValue}`,
    );
  }
}

function assertAtLeast(label: string, count: number, minimum: number) {
  if (count < minimum) {
    throw new Error(`${label} expected at least ${minimum}, found ${count}`);
  }
}

async function main() {
  const publicViews = await db.execute<NameRow>(sql`
    SELECT table_name AS name
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  assertEqual('public views', sortedNames(publicViews), expectedViews);

  const procedures = await db.execute<NameRow>(sql`
    SELECT routine_name AS name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'PROCEDURE'
    ORDER BY routine_name
  `);
  assertEqual('public procedures', sortedNames(procedures), expectedProcedures);

  const triggers = await db.execute<NameRow>(sql`
    SELECT trigger_name AS name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    GROUP BY trigger_name
    ORDER BY trigger_name
  `);
  assertEqual('public triggers', sortedNames(triggers), expectedTriggers);

  const viewGrants = await db.execute<{ table_name: string; grantee: string }>(
    sql`
      SELECT table_name, grantee
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN ('view_connector_pricing', 'view_station_catalog')
        AND privilege_type = 'SELECT'
        AND grantee IN ('anon', 'authenticated')
      ORDER BY table_name, grantee
    `,
  );
  const grantKeys = viewGrants.map((row) => `${row.table_name}:${row.grantee}`);
  assertEqual('view grants', grantKeys, [
    'view_connector_pricing:anon',
    'view_connector_pricing:authenticated',
    'view_station_catalog:anon',
    'view_station_catalog:authenticated',
  ]);

  const [connectorCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM connector_types`,
  );
  const [cityCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM cities`,
  );
  const [districtCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM districts`,
  );
  const [stationCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM stations`,
  );
  const [plugCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM plugs`,
  );
  const [userCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM users`,
  );
  const [employeeCount] = await db.execute<CountRow>(
    sql`SELECT count(*)::int AS count FROM employees`,
  );

  assertAtLeast('connector_types', countValue(connectorCount), 4);
  assertAtLeast('cities', countValue(cityCount), 2);
  assertAtLeast('districts', countValue(districtCount), 3);
  assertAtLeast('stations', countValue(stationCount), 3);
  assertAtLeast('plugs', countValue(plugCount), 4);
  assertAtLeast('users', countValue(userCount), 3);
  assertAtLeast('employees', countValue(employeeCount), 2);

  console.log('Database verification passed.');
}

main()
  .catch((error) => {
    console.error('Database verification failed:', error.message);
    process.exit(1);
  })
  .finally(() => queryClient.end());
