/**
 * Database client — handles all Supabase Postgres connection modes:
 *   • Direct connection:       db.<ref>.supabase.co:5432   (IPv6, SSL required)
 *   • Session pooler:          aws-0-<region>.pooler…:5432  (IPv4, prepared stmts OK)
 *   • Transaction pooler:      aws-0-<region>.pooler…:6543  (IPv4, no prepared stmts)
 *
 * The direct connection hostname resolves to IPv6 only. Node.js defaults to
 * IPv4-first, so we enable IPv6-first DNS resolution globally here.
 */

import { setDefaultResultOrder } from 'dns';
// Direct Supabase DB connection resolves to IPv6-only → prefer IPv6 in DNS lookups.
setDefaultResultOrder('ipv6first');

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import '../env';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required. Set it to the Supabase Postgres connection string.',
  );
}

let parsedDatabaseUrl: URL;

try {
  parsedDatabaseUrl = new URL(connectionString);
} catch {
  throw new Error(
    'DATABASE_URL is not a valid URL. URL-encode special characters in the database password ' +
      '(? → %3F, @ → %40, # → %23, % → %25, : → %3A).',
  );
}

/** Transaction pooler (port 6543) does NOT support prepared statements. */
const usesTransactionPooler =
  parsedDatabaseUrl.hostname.endsWith('.pooler.supabase.com') &&
  parsedDatabaseUrl.port === '6543';

/** Direct connection or session pooler both support prepared statements. */
const requirePrepare = !usesTransactionPooler;

/** Require SSL for direct Supabase connections and any URL with sslmode=require. */
const sslMode = parsedDatabaseUrl.searchParams.get('sslmode');
const requireSsl =
  parsedDatabaseUrl.hostname.startsWith('db.') ||
  parsedDatabaseUrl.hostname.endsWith('.supabase.co') ||
  sslMode === 'require' ||
  sslMode === 'verify-full';

export const queryClient = postgres(connectionString, {
  max: 10,
  prepare: requirePrepare,
  ssl: requireSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(queryClient, { schema });
