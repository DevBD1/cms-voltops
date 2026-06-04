import { and, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { plugs, receipts, sessions, stations, users, userVehicles } from '../db/schema';
import { HttpError } from '../utils/http';
import { CatalogService } from './catalog.service';

const fallbackPricePerKwh = 7.5;
const receiptTaxRate = 0.2;
const demoBatteryCapacityKwh = 75;
const demoStartingBatteryPercent = 20;
const demoMaxBatteryPercent = 95;

type Session = typeof sessions.$inferSelect;
export type SessionStatus = 'active' | 'completed' | 'cancelled';

type SessionContextFilters = {
  id?: number;
  userId?: number;
  status?: SessionStatus | string;
};

function isUniqueViolation(error: unknown, constraintName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; constraint?: unknown; constraint_name?: unknown; message?: unknown };

  return (
    candidate.code === '23505' &&
    (candidate.constraint === constraintName ||
      candidate.constraint_name === constraintName ||
      (typeof candidate.message === 'string' && candidate.message.includes(constraintName)))
  );
}

export class SessionService {
  constructor(private readonly catalogService: CatalogService) {}

  async listSessions(filters?: { userId?: number; status?: SessionStatus | string }) {
    return this.loadSessionContexts(filters);
  }

  async startSession(userId: number, plugCode: string, vehiclePlateNumber?: string | null) {
    const now = new Date();

    try {
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

      return this.loadSessionContext(session.id);
    } catch (error) {
      if (isUniqueViolation(error, 'sessions_active_user_unique')) {
        throw new HttpError(409, 'Active session already exists');
      }

      throw error;
    }
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

    return this.loadSessionContext(session.id);
  }

  private async loadSessionContext(sessionId: number) {
    const [session] = await this.loadSessionContexts({ id: sessionId });

    if (!session) {
      throw new HttpError(500, `Session ${sessionId} could not be loaded`);
    }

    return session;
  }

  private async loadSessionContexts(filters?: SessionContextFilters) {
    const conditions: SQL[] = [];

    if (filters?.id !== undefined) {
      conditions.push(eq(sessions.id, filters.id));
    }

    if (filters?.userId !== undefined) {
      conditions.push(eq(sessions.userId, filters.userId));
    }

    if (filters?.status) {
      conditions.push(eq(sessions.status, filters.status));
    }

    const query = db
      .select({
        session: sessions,
        user: users,
        plug: plugs,
        station: stations,
        receipt: receipts,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(plugs, eq(sessions.plugCode, plugs.plugCode))
      .innerJoin(stations, eq(plugs.stationCode, stations.stationCode))
      .leftJoin(receipts, eq(receipts.sessionId, sessions.id));
    const filteredQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;
    const rows = await filteredQuery.orderBy(desc(sessions.startedAt), desc(sessions.id));

    return rows.map((row) => this.toSessionContext(row));
  }

  private toSessionContext(row: {
    session: Session;
    user: typeof users.$inferSelect;
    plug: typeof plugs.$inferSelect;
    station: typeof stations.$inferSelect;
    receipt: typeof receipts.$inferSelect | null;
  }) {
    const publicUser = row.user
      ? {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          email: row.user.email,
          phone: row.user.phone,
          isActive: row.user.isActive,
          createdAt: row.user.createdAt,
          updatedAt: row.user.updatedAt,
        }
      : undefined;
    const plug = { ...row.plug, station: row.station };

    return {
      ...row.session,
      user: publicUser,
      plug,
      receipt: row.receipt ?? null,
      live: row.session.status === 'active' ? this.toLiveProjection(row.session, Number(row.plug.powerKw)) : undefined,
    };
  }

  private toLiveProjection(session: Session, chargeSpeedKw: number) {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000));
    const unconstrainedEnergyKwh = (chargeSpeedKw * elapsedSeconds) / 3600;
    const maxDemoEnergyKwh = ((demoMaxBatteryPercent - demoStartingBatteryPercent) / 100) * demoBatteryCapacityKwh;
    const estimatedEnergyKwh = Math.round(Math.min(unconstrainedEnergyKwh, maxDemoEnergyKwh) * 100) / 100;
    const estimatedPrice = Math.round(estimatedEnergyKwh * fallbackPricePerKwh * (1 + receiptTaxRate) * 100) / 100;
    const batteryPercent = Math.min(
      demoMaxBatteryPercent,
      Math.round((demoStartingBatteryPercent + (estimatedEnergyKwh / demoBatteryCapacityKwh) * 100) * 10) / 10,
    );

    return {
      elapsedSeconds,
      estimatedEnergyKwh,
      estimatedPrice,
      batteryPercent,
      chargeSpeedKw,
      currency: 'TRY',
    };
  }
}
