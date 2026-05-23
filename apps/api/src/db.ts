import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from '@voltops/db';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not defined. Check your .env file.');
  process.exit(1);
}

export const queryClient = postgres(databaseUrl);
export const db = drizzle(queryClient, { schema });
