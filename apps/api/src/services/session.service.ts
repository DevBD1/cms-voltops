import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { plugs, receipts, sessions, users, userVehicles } from '../db/schema';
import { HttpError } from '../utils/http';
import { CatalogService } from './catalog.service';

const fallbackPricePerKwh = 7.5;
const receiptTaxRate = 0.2;

type Session = typeof sessions.$inferSelect;
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export class SessionService {
  constructor(private readonly catalogService: CatalogService) {}

  async listSessions(filters?: { userId?: number; status?: SessionStatus | string }) {
    const conditions: SQL[] = [];

    if (filters?.userId !== undefined) {
      conditions.push(eq(sessions.userId, filters.userId));
    }

    if (filters?.status) {
      conditions.push(eq(sessions.status, filters.status));
    }

    const query = db.select().from(sessions);
    const sessionRows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return Promise.all(sessionRows.map((session) => this.withContext(session)));
  }

  async startSession(userId: number, plugCode: string, vehiclePlateNumber?: string | null) {
    const now = new Date();

    const session = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId));

      if (!user || !user.isActive) {
        throw new HttpError(404, 'Active user not found');
      }

      const [activeSession] = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.status, 'active')));

      if (activeSession) {
        throw new HttpError(409, 'Active session already exists');
      }

      if (vehiclePlateNumber) {
        const [vehicle] = await tx
          .select({ id: userVehicles.id })
          .from(userVehicles)
          .where(and(eq(userVehicles.userId, userId), eq(userVehicles.vehiclePlateNumber, vehiclePlateNumber)));
        if (!vehicle) {
          throw new HttpError(404, 'Vehicle not found');
        }
      }

      const [claimedPlug] = await tx
        .update(plugs)
        .set({ status: 'in_use', updatedAt: now })
        .where(and(eq(plugs.plugCode, plugCode), eq(plugs.status, 'available')))
        .returning();

      if (!claimedPlug) {
        const [plug] = await tx.select().from(plugs).where(eq(plugs.plugCode, plugCode));

        if (!plug) {
          throw new HttpError(404, 'Plug not found');
        }

        throw new HttpError(409, 'Plug is not available');
      }

      const [createdSession] = await tx
        .insert(sessions)
        .values({
          userId,
          plugCode,
          vehiclePlateNumber: vehiclePlateNumber ?? null,
          startedAt: now,
          status: 'active',
        })
        .returning();

      return createdSession;
    });

    return this.withContext(session);
  }

  async endSession(sessionId: number, energyKwh: number, userId?: number) {
    const now = new Date();

    const session = await db.transaction(async (tx) => {
      const [sessionRow] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));

      if (!sessionRow) {
        throw new HttpError(404, 'Session not found');
      }

      if (userId !== undefined && sessionRow.userId !== userId) {
        throw new HttpError(404, 'Session not found');
      }

      if (sessionRow.status !== 'active') {
        throw new HttpError(409, 'Session is not active');
      }

      if (energyKwh <= 0) {
        throw new HttpError(400, 'energyKwh must be greater than zero');
      }

      const subtotal = Math.round(energyKwh * fallbackPricePerKwh * 100) / 100;
      const taxAmount = Math.round(subtotal * receiptTaxRate * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
      const durationMinutes = Math.max(1, Math.round((now.getTime() - sessionRow.startedAt.getTime()) / 60000));

      const [updatedSession] = await tx
        .update(sessions)
        .set({
          endedAt: now,
          energyKwh: String(energyKwh),
          durationMinutes: String(durationMinutes),
          totalPrice: String(totalAmount),
          status: 'completed',
          updatedAt: now,
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      await tx.update(plugs).set({ status: 'available', updatedAt: now }).where(eq(plugs.plugCode, sessionRow.plugCode));
      await tx
        .insert(receipts)
        .values({
          receiptNo: `R-${String(sessionId).padStart(6, '0')}`,
          sessionId,
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          totalAmount: String(totalAmount),
          currency: 'TRY',
          issuedAt: now,
        })
        .onConflictDoNothing();

      return updatedSession;
    });

    return this.withContext(session);
  }

  private async withContext(session: Session) {
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    const [receipt] = await db.select().from(receipts).where(eq(receipts.sessionId, session.id));
    const plug = (await this.catalogService.listPlugs()).find((item) => item.plugCode === session.plugCode);
    const publicUser = user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      : undefined;

    return {
      ...session,
      user: publicUser,
      plug,
      receipt: receipt ?? null,
    };
  }
}
