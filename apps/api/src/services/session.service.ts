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

function procedureMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidate = error as {
    message?: unknown;
    cause?: { message?: unknown };
  };

  if (typeof candidate.cause?.message === 'string') {
    return candidate.cause.message;
  }

  return typeof candidate.message === 'string' ? candidate.message : null;
}

function mapProcedureError(error: unknown): never {
  const message = procedureMessage(error);

  switch (message) {
    case 'Active user not found':
    case 'Vehicle not found':
    case 'Plug not found':
    case 'Session not found':
      throw new HttpError(404, message);
    case 'Active session already exists':
    case 'Plug is not available':
    case 'Session is not active':
      throw new HttpError(409, message);
    case 'energyKwh must be greater than zero':
      throw new HttpError(400, message);
    case 'Active pricing rule not found':
    case 'Active tax rate not found':
      throw new HttpError(500, message);
    default:
      throw error;
  }
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
    try {
      const result = await db.execute<{ session_id: number }>(
        sql`call public.proc_start_session(${userId}, ${plugCode}, ${
          vehiclePlateNumber ?? null
        }, null)`,
      );
      const [session] = result;

      if (!session) {
        throw new HttpError(500, 'Session could not be started');
      }

      return this.loadSessionContext(session.session_id);
    } catch (error) {
      if (isUniqueViolation(error, 'sessions_active_user_unique')) {
        throw new HttpError(409, 'Active session already exists');
      }

      return mapProcedureError(error);
    }
  }

  async endSession(sessionId: number, energyKwh: number, userId?: number) {
    try {
      const result = await db.execute<{ completed_session_id: number }>(
        sql`call public.proc_end_session(${sessionId}, ${energyKwh}, ${
          userId ?? null
        }, null)`,
      );
      const [session] = result;

      if (!session) {
        throw new HttpError(500, 'Session could not be ended');
      }

      return this.loadSessionContext(session.completed_session_id);
    } catch (error) {
      return mapProcedureError(error);
    }
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
