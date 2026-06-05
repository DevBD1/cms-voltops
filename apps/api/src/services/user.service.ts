import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { employees, users } from '../db/schema';
import { HttpError } from '../utils/http';

type AppUser = typeof users.$inferSelect;

export interface AdminUserView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Derived: 'ADMIN' if an active employee record exists, 'CUSTOMER' otherwise */
  role: 'ADMIN' | 'CUSTOMER';
  isActive: boolean;
  createdAt: Date;
}

function toAdminView(user: AppUser, isEmployee: boolean): AdminUserView {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? null,
    role: isEmployee ? 'ADMIN' : 'CUSTOMER',
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export class UserService {
  async listUsers(): Promise<AdminUserView[]> {
    const [allUsers, allEmployees] = await Promise.all([
      db.select().from(users).orderBy(users.createdAt),
      db.select({ userId: employees.userId }).from(employees),
    ]);
    const employeeUserIds = new Set(allEmployees.map((e) => e.userId));
    return allUsers.map((u) => toAdminView(u, employeeUserIds.has(u.id)));
  }

  async getUser(userId: number): Promise<AdminUserView> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new HttpError(404, 'User not found');

    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, userId));

    return toAdminView(user, !!employee);
  }

  async updateUser(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      isActive?: boolean;
    },
  ): Promise<AdminUserView> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new HttpError(404, 'User not found');

    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, userId));

    return toAdminView(updated, !!employee);
  }
}
