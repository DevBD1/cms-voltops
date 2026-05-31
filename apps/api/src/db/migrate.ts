import '../env';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client';

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await queryClient.end();
}

main().catch(async (error) => {
  console.error(error);
  await queryClient.end();
  process.exit(1);
});
