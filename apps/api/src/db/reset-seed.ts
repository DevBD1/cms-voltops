import { sql } from 'drizzle-orm';
import '../env';
import { db, queryClient } from './client';
import { seedDatabase } from './seed';

function hasForceFlag() {
  return process.argv.includes('--force');
}

async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      addresses,
      station_employees,
      maintenance,
      tickets,
      receipts,
      sessions,
      user_vehicles,
      vehicles,
      plugs,
      stations,
      employees,
      users,
      pricing_rules,
      tax_rates,
      districts,
      cities,
      connector_types
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  if (!hasForceFlag()) {
    console.error(
      'Refusing to reset database without --force. Create a manual Supabase backup first, then run: pnpm db:reset-seed -- --force',
    );
    process.exit(1);
  }

  await resetDatabase();
  await seedDatabase();
  console.log('Reset and seed completed.');
}

main()
  .catch((error) => {
    console.error('Reset/seed failed:', error);
    process.exit(1);
  })
  .finally(() => queryClient.end());
