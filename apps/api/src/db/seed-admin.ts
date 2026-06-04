/**
 * Promotes an existing app user to an admin employee.
 *
 * Prerequisites:
 *   1. DATABASE_URL set in apps/api/.env
 *   2. Tables created (pnpm db:migrate)
 *   3. Supabase Auth user created in the dashboard
 *   4. Logged in once via the web-admin  ← this creates the public.users row
 *
 * Usage (from apps/api directory):
 *   pnpm tsx src/db/seed-admin.ts <email>
 *
 * Example:
 *   pnpm tsx src/db/seed-admin.ts admin@voltops.com
 */

import './../../src/env';
import '../env';
import { eq } from 'drizzle-orm';
import { db, queryClient } from './client';
import { employees, users } from './schema';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error('Usage: pnpm tsx src/db/seed-admin.ts <email>');
    process.exit(1);
  }

  console.log(`\nLooking up user: ${email}`);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`
✗ No user found with email "${email}" in public.users.

  Make sure you have:
  1. Created the Supabase Auth account (Dashboard → Authentication → Users)
  2. Logged in at least once via the web-admin (http://localhost:5173)
     This auto-creates the public.users row on first login.
`);
    process.exit(1);
  }

  console.log(`✓ Found user  id=${user.id}  name=${user.firstName} ${user.lastName}`);

  // Check if already an employee
  const [existing] = await db
    .select()
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (existing) {
    if (existing.status === 'active') {
      console.log(`✓ Already an active employee  code=${existing.employeeCode}`);
    } else {
      const [updated] = await db
        .update(employees)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(employees.id, existing.id))
        .returning();
      console.log(`✓ Employee re-activated  code=${updated.employeeCode}`);
    }
  } else {
    const employeeCode = `EMP-${String(user.id).padStart(4, '0')}`;
    const [created] = await db
      .insert(employees)
      .values({
        userId: user.id,
        employeeCode,
        department: 'Operations',
        jobTitle: 'Administrator',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .returning();

    console.log(`✓ Employee record created  code=${created.employeeCode}`);
  }

  console.log(`\n🔑 "${email}" can now access the admin dashboard at /dashboard\n`);
}

main()
  .catch((err) => {
    console.error('\n✗ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => queryClient.end());
