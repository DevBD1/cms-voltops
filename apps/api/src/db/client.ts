import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import '../env';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it to the Supabase Postgres connection string.');
}

let parsedDatabaseUrl: URL;

try {
  parsedDatabaseUrl = new URL(connectionString);
} catch {
  throw new Error('DATABASE_URL is not a valid URL. URL-encode special characters in the database password, such as ?, @, #, %, /, and :.');
}

const usesSupabaseTransactionPooler = parsedDatabaseUrl.hostname.endsWith('.pooler.supabase.com') && parsedDatabaseUrl.port === '6543';

export const queryClient = postgres(connectionString, {
  max: 10,
  prepare: !usesSupabaseTransactionPooler,
});
export const db = drizzle(queryClient, { schema });
