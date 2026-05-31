import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { CatalogService } from '../services/catalog.service';
import { PlugStatus, StationStatus } from '../services/catalog.service';
import { SessionService } from '../services/session.service';
import { TicketService } from '../services/ticket.service';
import { parseRequiredNumber, sendError } from '../utils/http';
import { logger } from '../utils/logger';

const allowedPlugStatuses: PlugStatus[] = ['available', 'in_use', 'fault', 'offline'];
const allowedStationStatuses: StationStatus[] = ['active', 'maintenance', 'offline'];

export function createAdminRouter(
  authService: AuthService,
  catalogService: CatalogService,
  sessionService: SessionService,
  ticketService: TicketService,
): Router {
  const router = Router();

  router.use(async (req, res, next) => {
    try {
      const auth = await authService.authenticateAdmin(req.header('authorization'), res.locals.requestId);
      res.locals.auth = auth;
      next();
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/dashboard', async (_req, res) => {
    try {
      const [stationRows, plugRows, activeSessions, ticketRows] = await Promise.all([
        catalogService.listStations(),
        catalogService.listPlugs(),
        sessionService.listSessions({ status: 'active' }),
        ticketService.listTickets(),
      ]);
      const openTickets = ticketRows.filter((ticket) => ticket.status !== 'resolved');
      const dashboard = {
        stations: stationRows.length,
        activeStations: stationRows.filter((station) => station.status === 'active').length,
        plugs: plugRows.length,
        availablePlugs: plugRows.filter((plug) => plug.status === 'available').length,
        activeSessions: activeSessions.length,
        openTickets: openTickets.length,
      };

      logger.debug('admin.dashboard_loaded', {
        requestId: res.locals.requestId,
        stations: dashboard.stations,
        activeSessions: dashboard.activeSessions,
        openTickets: dashboard.openTickets,
      });

      res.json({ data: dashboard });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/stations', async (_req, res) => {
    try {
      const stationRows = await catalogService.listStations();

      logger.debug('admin.stations_listed', {
        requestId: res.locals.requestId,
        count: stationRows.length,
      });

      res.json({ data: stationRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/stations/:stationCode', async (req, res) => {
    try {
      const station = await catalogService.getStation(req.params.stationCode);

      logger.debug('admin.station_loaded', {
        requestId: res.locals.requestId,
        stationCode: req.params.stationCode,
        plugCount: station.plugs.length,
      });

      res.json({ data: station });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/stations/:stationCode/status', async (req, res) => {
    try {
      const status = String(req.body.status ?? '') as StationStatus;

      if (!allowedStationStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowedStationStatuses.join(', ')}` });
        return;
      }

      const station = await catalogService.setStationStatus(req.params.stationCode, status);

      logger.debug('admin.station_status_updated', {
        requestId: res.locals.requestId,
        stationCode: req.params.stationCode,
        status: station.status,
      });

      res.json({ data: station });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/plugs', async (req, res) => {
    try {
      const stationCode = req.query.stationCode === undefined ? undefined : String(req.query.stationCode);
      const status = req.query.status === undefined ? undefined : String(req.query.status);
      const plugRows = await catalogService.listPlugs({ stationCode, status });

      logger.debug('admin.plugs_listed', {
        requestId: res.locals.requestId,
        stationCode: stationCode ?? 'all',
        status: status ?? 'all',
        count: plugRows.length,
      });

      res.json({ data: plugRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/plugs/:plugCode/status', async (req, res) => {
    try {
      const status = String(req.body.status ?? '') as PlugStatus;

      if (!allowedPlugStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowedPlugStatuses.join(', ')}` });
        return;
      }

      const plug = await catalogService.setPlugStatus(req.params.plugCode, status);

      logger.debug('admin.plug_status_updated', {
        requestId: res.locals.requestId,
        plugCode: req.params.plugCode,
        status: plug.status,
      });

      res.json({ data: plug });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : String(req.query.status);
      const sessionRows = await sessionService.listSessions({ status });

      logger.debug('admin.sessions_listed', {
        requestId: res.locals.requestId,
        status: status ?? 'all',
        count: sessionRows.length,
      });

      res.json({ data: sessionRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/tickets', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : String(req.query.status);
      const ticketRows = await ticketService.listTickets({ status });

      logger.debug('admin.tickets_listed', {
        requestId: res.locals.requestId,
        status: status ?? 'all',
        count: ticketRows.length,
      });

      res.json({ data: ticketRows });
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

      logger.debug('admin.ticket_updated', {
        requestId: res.locals.requestId,
        ticketId: ticket.id,
        priority: ticket.priority,
        status: ticket.status,
      });

      res.json({ data: ticket });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
