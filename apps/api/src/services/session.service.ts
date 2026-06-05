import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import {
  cities,
  connectorTypes,
  districts,
  plugs,
  pricingRules,
  receipts,
  sessions,
  stations,
  taxRates,
  users,
  userVehicles,
} from '../db/schema';
import { HttpError } from '../utils/http';
import { CatalogService } from './catalog.service';

const fallbackPricePerKwh = 7.5;
const receiptTaxRate = 0.2;
const demoBatteryCapacityKwh = 75;
const demoStartingBatteryPercent = 20;
const demoMaxBatteryPercent = 95;

type Session = typeof sessions.$inferSelect;
type Receipt = typeof receipts.$inferSelect;
type PricingRule = typeof pricingRules.$inferSelect;
type TaxRate = typeof taxRates.$inferSelect;
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

  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    message?: unknown;
  };

  return (
    candidate.code === '23505' &&
    (candidate.constraint === constraintName ||
      candidate.constraint_name === constraintName ||
      (typeof candidate.message === 'string' &&
        candidate.message.includes(constraintName)))
  );
}

export class SessionService {
  constructor(private readonly catalogService: CatalogService) {}

  async listSessions(filters?: {
    userId?: number;
    status?: SessionStatus | string;
  }) {
    return this.loadSessionContexts(filters);
  }

  async startSession(
    userId: number,
    plugCode: string,
    vehiclePlateNumber?: string | null,
  ) {
    const now = new Date();

    try {
      const session = await db.transaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (!user || !user.isActive) {
          throw new HttpError(404, 'Active user not found');
        }

        const [activeSession] = await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(eq(sessions.userId, userId), eq(sessions.status, 'active')),
          );

        if (activeSession) {
          throw new HttpError(409, 'Active session already exists');
        }

        if (vehiclePlateNumber) {
          const [vehicle] = await tx
            .select({ id: userVehicles.id })
            .from(userVehicles)
            .where(
              and(
                eq(userVehicles.userId, userId),
                eq(userVehicles.vehiclePlateNumber, vehiclePlateNumber),
              ),
            );
          if (!vehicle) {
            throw new HttpError(404, 'Vehicle not found');
          }
        }

        const [claimedPlug] = await tx
          .update(plugs)
          .set({ status: 'in_use', updatedAt: now })
          .where(
            and(eq(plugs.plugCode, plugCode), eq(plugs.status, 'available')),
          )
          .returning();

        if (!claimedPlug) {
          const [plug] = await tx
            .select()
            .from(plugs)
            .where(eq(plugs.plugCode, plugCode));

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
      const [sessionRow] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId));

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

      const [plug] = await tx
        .select({
          connectorTypeCode: plugs.connectorTypeCode,
        })
        .from(plugs)
        .where(eq(plugs.plugCode, sessionRow.plugCode))
        .limit(1);

      if (!plug) {
        throw new HttpError(404, 'Plug not found');
      }

      const [pricingRule] = await tx
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.connectorTypeCode, plug.connectorTypeCode),
            sql`${pricingRules.validFrom} <= ${now}`,
            sql`(${pricingRules.validTo} is null or ${pricingRules.validTo} > ${now})`,
          ),
        )
        .orderBy(desc(pricingRules.validFrom))
        .limit(1);

      if (!pricingRule) {
        throw new HttpError(500, 'Active pricing rule not found');
      }

      const [taxRate] = await tx
        .select()
        .from(taxRates)
        .where(
          and(
            sql`${taxRates.validFrom} <= ${now}`,
            sql`(${taxRates.validTo} is null or ${taxRates.validTo} > ${now})`,
          ),
        )
        .orderBy(desc(taxRates.validFrom))
        .limit(1);

      if (!taxRate) {
        throw new HttpError(500, 'Active tax rate not found');
      }

      const [updatedSession] = await tx
        .update(sessions)
        .set({
          endedAt: now,
          energyKwh: String(energyKwh),
          status: 'completed',
          updatedAt: now,
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      await tx
        .update(plugs)
        .set({ status: 'available', updatedAt: now })
        .where(eq(plugs.plugCode, sessionRow.plugCode));
      await tx
        .insert(receipts)
        .values({
          receiptNo: `R-${String(sessionId).padStart(6, '0')}`,
          sessionId,
          pricingRuleId: pricingRule.id,
          taxRateId: taxRate.id,
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
        connectorType: connectorTypes,
        station: stations,
        district: districts,
        city: cities,
        receipt: receipts,
        pricingRule: pricingRules,
        taxRate: taxRates,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(plugs, eq(sessions.plugCode, plugs.plugCode))
      .innerJoin(
        connectorTypes,
        eq(plugs.connectorTypeCode, connectorTypes.code),
      )
      .innerJoin(stations, eq(plugs.stationCode, stations.stationCode))
      .innerJoin(districts, eq(stations.districtId, districts.id))
      .innerJoin(cities, eq(districts.cityId, cities.id))
      .leftJoin(receipts, eq(receipts.sessionId, sessions.id));
    const withPricing = query
      .leftJoin(pricingRules, eq(receipts.pricingRuleId, pricingRules.id))
      .leftJoin(taxRates, eq(receipts.taxRateId, taxRates.id));
    const filteredQuery =
      conditions.length > 0
        ? withPricing.where(and(...conditions))
        : withPricing;
    const rows = await filteredQuery.orderBy(
      desc(sessions.startedAt),
      desc(sessions.id),
    );

    return rows.map((row) => this.toSessionContext(row));
  }

  private toSessionContext(row: {
    session: Session;
    user: typeof users.$inferSelect;
    plug: typeof plugs.$inferSelect;
    connectorType: typeof connectorTypes.$inferSelect;
    station: typeof stations.$inferSelect;
    district: typeof districts.$inferSelect;
    city: typeof cities.$inferSelect;
    receipt: Receipt | null;
    pricingRule: PricingRule | null;
    taxRate: TaxRate | null;
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
    const plug = {
      ...row.plug,
      plugType: row.connectorType.code,
      currentType: row.connectorType.currentType,
      connectorType: row.connectorType,
      station: {
        ...row.station,
        city: row.city.name,
        district: row.district.name,
        countryCode: row.city.countryCode,
      },
    };
    const durationMinutes = computeDurationMinutes(
      row.session.startedAt,
      row.session.endedAt,
    );
    const receipt =
      row.receipt && row.pricingRule && row.taxRate
        ? toComputedReceipt(
            row.receipt,
            row.session.energyKwh,
            row.pricingRule,
            row.taxRate,
          )
        : null;

    return {
      ...row.session,
      durationMinutes:
        durationMinutes === null ? null : String(durationMinutes),
      totalPrice: receipt?.totalAmount ?? null,
      user: publicUser,
      plug,
      receipt,
      live:
        row.session.status === 'active'
          ? this.toLiveProjection(row.session, Number(row.plug.powerKw))
          : undefined,
    };
  }

  private toLiveProjection(session: Session, chargeSpeedKw: number) {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    );
    const unconstrainedEnergyKwh = (chargeSpeedKw * elapsedSeconds) / 3600;
    const maxDemoEnergyKwh =
      ((demoMaxBatteryPercent - demoStartingBatteryPercent) / 100) *
      demoBatteryCapacityKwh;
    const estimatedEnergyKwh =
      Math.round(Math.min(unconstrainedEnergyKwh, maxDemoEnergyKwh) * 100) /
      100;
    const estimatedPrice =
      Math.round(
        estimatedEnergyKwh * fallbackPricePerKwh * (1 + receiptTaxRate) * 100,
      ) / 100;
    const batteryPercent = Math.min(
      demoMaxBatteryPercent,
      Math.round(
        (demoStartingBatteryPercent +
          (estimatedEnergyKwh / demoBatteryCapacityKwh) * 100) *
          10,
      ) / 10,
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

function computeDurationMinutes(startedAt: Date, endedAt: Date | null) {
  if (!endedAt) {
    return null;
  }

  return Math.max(
    1,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
  );
}

function computeTotals(
  energyKwh: number,
  pricePerKwh: number,
  taxRate: number,
) {
  const subtotal = Math.round(energyKwh * pricePerKwh * 100) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
}

function toComputedReceipt(
  receipt: Receipt,
  energyKwh: string | null,
  pricingRule: PricingRule,
  taxRate: TaxRate,
) {
  const totals = computeTotals(
    Number(energyKwh ?? 0),
    Number(pricingRule.pricePerKwh),
    Number(taxRate.rate),
  );

  return {
    ...receipt,
    ...totals,
    currency: pricingRule.currency,
  };
}
