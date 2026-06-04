import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { CatalogService } from '../services/catalog.service';
import { SessionService, SessionStatus } from '../services/session.service';
import { TicketService } from '../services/ticket.service';
import { allowedConnectorTypes, ConnectorType, VehicleService } from '../services/vehicle.service';
import { HttpError, parseOptionalEnum, parsePositiveNumber, parseRequiredNumber, parseRequiredString, sendError } from '../utils/http';
import { logger } from '../utils/logger';

const allowedSessionStatuses: SessionStatus[] = ['active', 'completed', 'cancelled'];

export function createMobileRouter(
  authService: AuthService,
  catalogService: CatalogService,
  sessionService: SessionService,
  ticketService: TicketService,
  vehicleService: VehicleService,
): Router {
  const router = Router();

  router.get('/me', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const profile = await authService.getProfile(auth.appUser.id);

      logger.debug('mobile.profile_loaded', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        vehicleCount: profile.vehicles.length,
      });

      res.json({ data: profile });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/stations', async (req, res) => {
    try {
      const latitude = req.query.lat === undefined ? undefined : parseRequiredNumber(req.query.lat, 'lat');
      const longitude = req.query.lng === undefined ? undefined : parseRequiredNumber(req.query.lng, 'lng');
      const radiusKm = parsePositiveNumber(req.query.radiusKm, 25);
      const stationRows = await catalogService.listStations({ latitude, longitude, radiusKm });

      logger.debug('mobile.stations_listed', {
        requestId: res.locals.requestId,
        count: stationRows.length,
        locationProvided: latitude !== undefined && longitude !== undefined,
        radiusKm,
      });

      res.json({ data: stationRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/stations/:stationCode', async (req, res) => {
    try {
      const station = await catalogService.getStation(req.params.stationCode);

      logger.debug('mobile.station_loaded', {
        requestId: res.locals.requestId,
        stationCode: req.params.stationCode,
        plugCount: station.plugs.length,
      });

      res.json({ data: station });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const status = parseOptionalEnum(req.query.status, 'status', allowedSessionStatuses);
      const sessionRows = await sessionService.listSessions({ userId: auth.appUser.id, status });

      logger.debug('mobile.sessions_listed', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        status: status ?? 'all',
        count: sessionRows.length,
      });

      res.json({ data: sessionRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/sessions', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const plugCode = parseRequiredString(req.body.plugCode, 'plugCode');
      const vehiclePlateNumber = parseRequiredString(req.body.vehiclePlateNumber, 'vehiclePlateNumber');
      const session = await sessionService.startSession(auth.appUser.id, plugCode, vehiclePlateNumber);

      logger.debug('mobile.session_started', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        sessionId: session.id,
        plugCode: session.plugCode,
      });

      res.status(201).json({ data: session });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/sessions/:sessionId/end', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const sessionId = parseRequiredNumber(req.params.sessionId, 'sessionId');
      const energyKwh = parseRequiredNumber(req.body.energyKwh, 'energyKwh');
      const session = await sessionService.endSession(sessionId, energyKwh, auth.appUser.id);

      logger.debug('mobile.session_ended', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        sessionId: session.id,
        status: session.status,
      });

      res.json({ data: session });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/vehicles', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const plateNumber = parseRequiredString(req.body.plateNumber, 'plateNumber');
      const connectorType = parseRequiredString(req.body.connectorType, 'connectorType') as ConnectorType;

      if (!allowedConnectorTypes.includes(connectorType)) {
        throw new HttpError(400, `connectorType must be one of: ${allowedConnectorTypes.join(', ')}`);
      }

      const profile = await vehicleService.addVehicle(auth.appUser.id, { plateNumber, connectorType });

      logger.debug('mobile.vehicle_added', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        vehicleCount: profile.vehicles.length,
      });

      res.status(201).json({ data: profile });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete('/vehicles/:plateNumber', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const profile = await vehicleService.removeVehicle(auth.appUser.id, req.params.plateNumber);

      logger.debug('mobile.vehicle_removed', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        vehicleCount: profile.vehicles.length,
      });

      res.json({ data: profile });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/tickets', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const ticketRows = await ticketService.listTickets({ userId: auth.appUser.id });

      logger.debug('mobile.tickets_listed', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        count: ticketRows.length,
      });

      res.json({ data: ticketRows });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/tickets', async (req, res) => {
    try {
      const auth = await authService.authenticate(req.header('authorization'), res.locals.requestId);
      const ticket = await ticketService.createTicket({
        userId: auth.appUser.id,
        stationCode: req.body.stationCode === undefined ? undefined : String(req.body.stationCode),
        sessionId: req.body.sessionId === undefined ? undefined : parseRequiredNumber(req.body.sessionId, 'sessionId'),
        title: String(req.body.title ?? ''),
        description: String(req.body.description ?? ''),
        priority: req.body.priority,
      });

      logger.debug('mobile.ticket_created', {
        requestId: res.locals.requestId,
        userId: auth.appUser.id,
        ticketId: ticket.id,
        priority: ticket.priority,
        status: ticket.status,
      });

      res.status(201).json({ data: ticket });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
