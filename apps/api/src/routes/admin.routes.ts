import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { receipts, sessions, stations, tickets as ticketsTable, users } from '../db/schema';
import { AuthService } from '../services/auth.service';
import { CatalogService, deriveCurrentType, type StationSummary, type PlugDetails } from '../services/catalog.service';
import { MaintenanceService } from '../services/maintenance.service';
import { SessionService } from '../services/session.service';
import { TicketService } from '../services/ticket.service';
import { UserService } from '../services/user.service';
import { parseRequiredNumber, sendError } from '../utils/http';
import { logger } from '../utils/logger';

// ─── Status normalisation helpers ─────────────────────────────────────────────

const allowedPlugStatuses = ['available', 'in_use', 'fault', 'offline'] as const;
const allowedStationStatuses = ['active', 'maintenance', 'offline'] as const;
type RawPlugStatus = (typeof allowedPlugStatuses)[number];
type RawStationStatus = (typeof allowedStationStatuses)[number];

function normalizeStationStatus(s: string): 'ACTIVE' | 'INACTIVE' {
  return s === 'active' ? 'ACTIVE' : 'INACTIVE';
}

function normalizePlugStatus(s: string): 'AVAILABLE' | 'CHARGING' | 'FAULTY' | 'RESERVED' {
  const map: Record<string, 'AVAILABLE' | 'CHARGING' | 'FAULTY' | 'RESERVED'> = {
    available: 'AVAILABLE',
    in_use: 'CHARGING',
    fault: 'FAULTY',
    offline: 'RESERVED',
  };
  return map[s] ?? 'AVAILABLE';
}

function normalizeSessionStatus(s: string): 'ACTIVE' | 'COMPLETED' | 'FAILED' {
  const map: Record<string, 'ACTIVE' | 'COMPLETED' | 'FAILED'> = {
    active: 'ACTIVE',
    completed: 'COMPLETED',
    failed: 'FAILED',
  };
  return map[s] ?? 'ACTIVE';
}

function toWebStation(s: StationSummary) {
  return {
    stationCode: s.stationCode,
    name: s.name,
    city: s.city,
    district: s.district,
    latitude: String(s.latitude),
    longitude: String(s.longitude),
    status: normalizeStationStatus(s.status),
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
    totalPlugs: s.totalPlugs,
    availablePlugs: s.availablePlugs,
    faultyPlugs: s.faultyPlugs,
  };
}

function toWebPlug(p: PlugDetails) {
  return {
    plugCode: p.plugCode,
    stationCode: p.stationCode,
    stationName: p.station.name,
    city: p.station.city,
    plugType: p.plugType,
    powerKw: String(p.powerKw),
    currentType: deriveCurrentType(p.plugType),
    status: normalizePlugStatus(p.status),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

// ─── Router factory ───────────────────────────────────────────────────────────

export function createAdminRouter(
  authService: AuthService,
  catalogService: CatalogService,
  sessionService: SessionService,
  ticketService: TicketService,
): Router {
  const router = Router();
  const userService = new UserService();
  const maintenanceService = new MaintenanceService();

  // ── Admin auth guard ──────────────────────────────────────────────────────
  router.use(async (req, res, next) => {
    try {
      const auth = await authService.authenticateAdmin(req.header('authorization'), res.locals.requestId);
      res.locals.auth = auth;
      next();
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  router.get('/dashboard', async (_req, res) => {
    try {
      const [stationRows, plugRows, activeSessions, ticketRows] = await Promise.all([
        catalogService.listStations(),
        catalogService.listPlugs(),
        sessionService.listSessions({ status: 'active' }),
        ticketService.listTickets(),
      ]);
      const openTickets = ticketRows.filter((t) => t.status !== 'resolved');

      logger.debug('admin.dashboard_loaded', { requestId: res.locals.requestId });

      res.json({
        data: {
          stations: stationRows.length,
          activeStations: stationRows.filter((s) => s.status === 'active').length,
          plugs: plugRows.length,
          availablePlugs: plugRows.filter((p) => p.status === 'available').length,
          activeSessions: activeSessions.length,
          openTickets: openTickets.length,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Stations ─────────────────────────────────────────────────────────────
  router.get('/stations', async (_req, res) => {
    try {
      const rows = await catalogService.listStations();
      res.json({ data: rows.map(toWebStation) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/stations/:stationCode', async (req, res) => {
    try {
      const station = await catalogService.getStation(req.params.stationCode);
      res.json({
        data: {
          ...toWebStation(station),
          plugs: station.plugs.map(toWebPlug),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/stations', async (req, res) => {
    try {
      const { stationCode, name, city, district, latitude, longitude } = req.body as {
        stationCode?: string;
        name?: string;
        city?: string;
        district?: string;
        latitude?: number;
        longitude?: number;
      };

      if (!stationCode || !name || !city || latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'stationCode, name, city, latitude ve longitude gereklidir.' });
        return;
      }

      const [created] = await db
        .insert(stations)
        .values({
          stationCode,
          name,
          city,
          district: district ?? city,
          latitude: String(latitude),
          longitude: String(longitude),
          status: 'active',
        })
        .returning();

      const summary = await catalogService.getStation(created.stationCode);
      logger.debug('admin.station_created', { requestId: res.locals.requestId, stationCode: created.stationCode });
      res.status(201).json({ data: toWebStation(summary) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/stations/:stationCode', async (req, res) => {
    try {
      const { name, city, district, latitude, longitude, status } = req.body as {
        name?: string;
        city?: string;
        district?: string;
        latitude?: number;
        longitude?: number;
        status?: string;
      };

      const updateData: Partial<typeof stations.$inferInsert> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (city !== undefined) updateData.city = city;
      if (district !== undefined) updateData.district = district;
      if (latitude !== undefined) updateData.latitude = String(latitude);
      if (longitude !== undefined) updateData.longitude = String(longitude);
      if (status !== undefined) {
        const raw = status.toLowerCase() as RawStationStatus;
        if (!allowedStationStatuses.includes(raw)) {
          res.status(400).json({ error: `status must be one of: ${allowedStationStatuses.join(', ')}` });
          return;
        }
        updateData.status = raw;
      }

      const [updated] = await db
        .update(stations)
        .set(updateData)
        .where(eq(stations.stationCode, req.params.stationCode))
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Station not found' });
        return;
      }

      const summary = await catalogService.getStation(updated.stationCode);
      logger.debug('admin.station_updated', { requestId: res.locals.requestId, stationCode: updated.stationCode });
      res.json({ data: toWebStation(summary) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/stations/:stationCode/status', async (req, res) => {
    try {
      const status = String(req.body.status ?? '').toLowerCase() as RawStationStatus;
      if (!allowedStationStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowedStationStatuses.join(', ')}` });
        return;
      }
      const station = await catalogService.setStationStatus(req.params.stationCode, status);
      logger.debug('admin.station_status_updated', { requestId: res.locals.requestId, stationCode: req.params.stationCode, status });
      res.json({ data: toWebStation(station) });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Plugs ─────────────────────────────────────────────────────────────────
  router.get('/plugs', async (req, res) => {
    try {
      const stationCode = req.query.stationCode === undefined ? undefined : String(req.query.stationCode);
      const status = req.query.status === undefined ? undefined : String(req.query.status);
      const rows = await catalogService.listPlugs({ stationCode, status });
      res.json({ data: rows.map(toWebPlug) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/plugs/by-station/:stationCode', async (req, res) => {
    try {
      const rows = await catalogService.listPlugs({ stationCode: req.params.stationCode });
      res.json({ data: rows.map(toWebPlug) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/plugs/:plugCode/status', async (req, res) => {
    try {
      const raw = String(req.body.status ?? '').toLowerCase() as RawPlugStatus;
      if (!allowedPlugStatuses.includes(raw)) {
        res.status(400).json({ error: `status must be one of: ${allowedPlugStatuses.join(', ')}` });
        return;
      }
      const plug = await catalogService.setPlugStatus(req.params.plugCode, raw);
      logger.debug('admin.plug_status_updated', { requestId: res.locals.requestId, plugCode: req.params.plugCode, status: raw });
      res.json({ data: toWebPlug(plug) });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Sessions ─────────────────────────────────────────────────────────────
  router.get('/sessions', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : String(req.query.status).toLowerCase();
      const rows = await sessionService.listSessions({ status });
      res.json({
        data: rows.map((s) => ({
          id: s.id,
          userId: s.userId,
          userFullName: s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : 'Unknown',
          plugCode: s.plugCode,
          plugType: s.plug?.plugType ?? '',
          stationName: s.plug?.station.name ?? '',
          startedAt: s.startedAt instanceof Date ? s.startedAt.toISOString() : s.startedAt,
          endedAt: s.endedAt instanceof Date ? s.endedAt.toISOString() : (s.endedAt ?? null),
          energyKwh: s.energyKwh ?? null,
          totalPrice: s.totalPrice ?? null,
          status: normalizeSessionStatus(s.status),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/sessions', async (req, res) => {
    try {
      const auth = res.locals.auth;
      const plugCode = String(req.body.plugCode ?? '');
      if (!plugCode) {
        res.status(400).json({ error: 'plugCode gereklidir.' });
        return;
      }
      const session = await sessionService.startSession(auth.appUser.id, plugCode, req.body.vehiclePlateNumber);
      logger.debug('admin.session_started', { requestId: res.locals.requestId, sessionId: session.id });
      res.status(201).json({ data: session });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/sessions/:sessionId/end', async (req, res) => {
    try {
      const sessionId = parseRequiredNumber(req.params.sessionId, 'sessionId');
      const energyKwh = parseRequiredNumber(req.body.energyKwh, 'energyKwh');
      // Admin can end any session (no userId restriction)
      const session = await sessionService.endSession(sessionId, energyKwh);
      logger.debug('admin.session_ended', { requestId: res.locals.requestId, sessionId: session.id });
      res.json({ data: session });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Receipts ─────────────────────────────────────────────────────────────
  router.get('/receipts', async (_req, res) => {
    try {
      const rows = await db
        .select({
          receiptNo: receipts.receiptNo,
          sessionId: receipts.sessionId,
          subtotal: receipts.subtotal,
          taxAmount: receipts.taxAmount,
          totalAmount: receipts.totalAmount,
          currency: receipts.currency,
          issuedAt: receipts.issuedAt,
          createdAt: receipts.createdAt,
          // session fields for context
          plugCode: sessions.plugCode,
          energyKwh: sessions.energyKwh,
        })
        .from(receipts)
        .innerJoin(sessions, eq(receipts.sessionId, sessions.id))
        .orderBy(receipts.issuedAt);

      res.json({
        data: rows.map((r) => ({
          receiptNo: r.receiptNo,
          sessionId: r.sessionId,
          plugCode: r.plugCode,
          energyKwh: r.energyKwh ?? null,
          subtotal: String(r.subtotal),
          taxAmount: String(r.taxAmount),
          totalAmount: String(r.totalAmount),
          currency: r.currency,
          issuedAt: r.issuedAt instanceof Date ? r.issuedAt.toISOString() : r.issuedAt,
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/receipts/:receiptNo', async (req, res) => {
    try {
      const [row] = await db
        .select()
        .from(receipts)
        .where(eq(receipts.receiptNo, req.params.receiptNo))
        .limit(1);

      if (!row) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, row.sessionId))
        .limit(1);

      const plugRow = session
        ? await catalogService.listPlugs({ stationCode: undefined }).then((ps) => ps.find((p) => p.plugCode === session.plugCode))
        : undefined;

      res.json({
        data: {
          receiptNo: row.receiptNo,
          sessionId: row.sessionId,
          plugCode: session?.plugCode ?? null,
          plugType: plugRow?.plugType ?? null,
          stationName: plugRow?.station.name ?? null,
          energyKwh: session?.energyKwh ?? null,
          subtotal: String(row.subtotal),
          taxAmount: String(row.taxAmount),
          totalAmount: String(row.totalAmount),
          currency: row.currency,
          issuedAt: row.issuedAt instanceof Date ? row.issuedAt.toISOString() : row.issuedAt,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  router.get('/users', async (_req, res) => {
    try {
      const userList = await userService.listUsers();
      logger.debug('admin.users_listed', { requestId: res.locals.requestId, count: userList.length });
      res.json({ data: userList });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/users/:userId', async (req, res) => {
    try {
      const userId = parseRequiredNumber(req.params.userId, 'userId');
      const user = await userService.getUser(userId);
      res.json({ data: user });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/users', async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body as {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };

      if (!firstName || !lastName || !email) {
        res.status(400).json({ error: 'firstName, lastName ve email gereklidir.' });
        return;
      }

      const [created] = await db
        .insert(users)
        .values({
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          phone: phone ?? null,
          isActive: true,
          termsOfService: new Date(),
        })
        .returning();

      logger.debug('admin.user_created', { requestId: res.locals.requestId, userId: created.id });
      res.status(201).json({ data: await userService.getUser(created.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/users/:userId', async (req, res) => {
    try {
      const userId = parseRequiredNumber(req.params.userId, 'userId');
      const { firstName, lastName, phone, isActive } = req.body as {
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        isActive?: boolean;
      };

      const updated = await userService.updateUser(userId, { firstName, lastName, phone, isActive });
      logger.debug('admin.user_updated', { requestId: res.locals.requestId, userId });
      res.json({ data: updated });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Maintenance ───────────────────────────────────────────────────────────
  router.get('/maintenance', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : String(req.query.status);
      const stationCode = req.query.stationCode === undefined ? undefined : String(req.query.stationCode);
      const records = await maintenanceService.listMaintenance({ status, stationCode });
      logger.debug('admin.maintenance_listed', { requestId: res.locals.requestId, count: records.length });
      res.json({ data: records });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/maintenance', async (req, res) => {
    try {
      const { stationCode, plugCode, employeeId, maintenanceType, description, scheduledDate } = req.body as {
        stationCode?: string;
        plugCode?: string;
        employeeId?: number;
        maintenanceType?: string;
        description?: string;
        scheduledDate?: string;
      };

      if (!stationCode || !description || !maintenanceType || !scheduledDate) {
        res.status(400).json({ error: 'stationCode, maintenanceType, description ve scheduledDate gereklidir.' });
        return;
      }

      const record = await maintenanceService.createMaintenance({
        stationCode,
        plugCode,
        employeeId,
        maintenanceType,
        description,
        scheduledDate,
      });

      logger.debug('admin.maintenance_created', { requestId: res.locals.requestId, id: record.id });
      res.status(201).json({ data: record });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/maintenance/:maintenanceId', async (req, res) => {
    try {
      const maintenanceId = parseRequiredNumber(req.params.maintenanceId, 'maintenanceId');
      const { status, completedDate, description, employeeId } = req.body as {
        status?: string;
        completedDate?: string;
        description?: string;
        employeeId?: number;
      };

      const record = await maintenanceService.updateMaintenance(maintenanceId, { status, completedDate, description, employeeId });
      logger.debug('admin.maintenance_updated', { requestId: res.locals.requestId, id: maintenanceId });
      res.json({ data: record });
    } catch (error) {
      sendError(res, error);
    }
  });

  // ── Tickets ───────────────────────────────────────────────────────────────
  router.get('/tickets', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : String(req.query.status);

      // Enrich with userFullName and stationName via joins
      const rows = await db
        .select({
          id: ticketsTable.id,
          userId: ticketsTable.userId,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          stationCode: ticketsTable.stationCode,
          stationName: stations.name,
          title: ticketsTable.title,
          description: ticketsTable.description,
          priority: ticketsTable.priority,
          status: ticketsTable.status,
          createdAt: ticketsTable.createdAt,
          updatedAt: ticketsTable.updatedAt,
        })
        .from(ticketsTable)
        .leftJoin(users, eq(ticketsTable.userId, users.id))
        .leftJoin(stations, eq(ticketsTable.stationCode, stations.stationCode))
        .where(status ? eq(ticketsTable.status, status) : undefined)
        .orderBy(ticketsTable.createdAt);

      const data = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userFullName: `${r.userFirstName ?? ''} ${r.userLastName ?? ''}`.trim() || 'Unknown',
        stationCode: r.stationCode,
        stationName: r.stationName ?? null,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      }));

      logger.debug('admin.tickets_listed', { requestId: res.locals.requestId, count: data.length });
      res.json({ data });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tickets', async (req, res) => {
    try {
      const auth = res.locals.auth;
      const { title, description, stationCode, sessionId, priority } = req.body as {
        title?: string;
        description?: string;
        stationCode?: string;
        sessionId?: number;
        priority?: string;
      };

      if (!title || !description) {
        res.status(400).json({ error: 'title ve description gereklidir.' });
        return;
      }

      const ticket = await ticketService.createTicket({
        userId: auth.appUser.id,
        title,
        description,
        stationCode,
        sessionId,
        priority,
      });

      logger.debug('admin.ticket_created', { requestId: res.locals.requestId, ticketId: ticket.id });
      res.status(201).json({ data: ticket });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/tickets/:ticketId', async (req, res) => {
    try {
      const ticketId = parseRequiredNumber(req.params.ticketId, 'ticketId');
      const ticket = await ticketService.updateTicket(ticketId, {
        assignedEmployeeId:
          req.body.assignedEmployeeId === undefined
            ? undefined
            : parseRequiredNumber(req.body.assignedEmployeeId, 'assignedEmployeeId'),
        priority: req.body.priority,
        status: req.body.status,
      });

      logger.debug('admin.ticket_updated', { requestId: res.locals.requestId, ticketId: ticket.id });
      res.json({ data: ticket });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
