import express from 'express';
import request from 'supertest';
import { createMobileRouter } from './mobile.routes';

function createTestApp({
  authService = {
    authenticate: jest.fn().mockResolvedValue({ appUser: { id: 7 } }),
  },
  catalogService = { listStations: jest.fn(), getStation: jest.fn() },
  sessionService = {
    listSessions: jest.fn().mockResolvedValue([]),
    startSession: jest.fn(),
    endSession: jest.fn(),
  },
  ticketService = { listTickets: jest.fn(), createTicket: jest.fn() },
  vehicleService = { addVehicle: jest.fn(), removeVehicle: jest.fn() },
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.requestId = 'test-request-id';
    next();
  });
  app.use(
    '/api/mobile',
    createMobileRouter(
      authService as never,
      catalogService as never,
      sessionService as never,
      ticketService as never,
      vehicleService as never,
    ),
  );
  return {
    app,
    authService,
    catalogService,
    sessionService,
    ticketService,
    vehicleService,
  };
}

describe('createMobileRouter', () => {
  it('rejects start session without plugCode', async () => {
    const { app, sessionService } = createTestApp();

    const response = await request(app)
      .post('/api/mobile/sessions')
      .set('Authorization', 'Bearer user-token')
      .send({ vehiclePlateNumber: '34ABC123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'plugCode is required' });
    expect(sessionService.startSession).not.toHaveBeenCalled();
  });

  it('rejects start session without vehiclePlateNumber', async () => {
    const { app, sessionService } = createTestApp();

    const response = await request(app)
      .post('/api/mobile/sessions')
      .set('Authorization', 'Bearer user-token')
      .send({ plugCode: 'PLUG-1' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'vehiclePlateNumber is required' });
    expect(sessionService.startSession).not.toHaveBeenCalled();
  });

  it('rejects invalid session status filters', async () => {
    const { app, sessionService } = createTestApp();

    const response = await request(app)
      .get('/api/mobile/sessions?status=pending')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'status must be one of: active, completed, cancelled',
    });
    expect(sessionService.listSessions).not.toHaveBeenCalled();
  });

  it('rejects add vehicle with an invalid connector type', async () => {
    const { app, vehicleService } = createTestApp();

    const response = await request(app)
      .post('/api/mobile/vehicles')
      .set('Authorization', 'Bearer user-token')
      .send({ plateNumber: '34ABC123', connectorType: 'Tesla' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'connectorType must be one of: CCS, Type-2, CHAdeMO',
    });
    expect(vehicleService.addVehicle).not.toHaveBeenCalled();
  });

  it('adds a vehicle for the authenticated user', async () => {
    const profile = {
      user: { id: 7 },
      vehicles: [
        { plateNumber: '34ABC123', connectorType: 'CCS', isPrimary: true },
      ],
    };
    const { app, vehicleService } = createTestApp({
      vehicleService: {
        addVehicle: jest.fn().mockResolvedValue(profile),
        removeVehicle: jest.fn(),
      },
    });

    const response = await request(app)
      .post('/api/mobile/vehicles')
      .set('Authorization', 'Bearer user-token')
      .send({ plateNumber: '34 abc 123', connectorType: 'CCS' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: profile });
    expect(vehicleService.addVehicle).toHaveBeenCalledWith(7, {
      plateNumber: '34 abc 123',
      connectorType: 'CCS',
    });
  });

  it('removes a vehicle for the authenticated user', async () => {
    const profile = { user: { id: 7 }, vehicles: [] };
    const { app, vehicleService } = createTestApp({
      vehicleService: {
        addVehicle: jest.fn(),
        removeVehicle: jest.fn().mockResolvedValue(profile),
      },
    });

    const response = await request(app)
      .delete('/api/mobile/vehicles/34ABC123')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: profile });
    expect(vehicleService.removeVehicle).toHaveBeenCalledWith(7, '34ABC123');
  });

  it('creates a ticket with authenticated user session context', async () => {
    const ticket = {
      id: 12,
      userId: 7,
      sessionId: 44,
      stationCode: 'ST-1',
      title: 'Blocked charger',
      status: 'open',
    };
    const { app, ticketService } = createTestApp({
      ticketService: {
        listTickets: jest.fn(),
        createTicket: jest.fn().mockResolvedValue(ticket),
      },
    });

    const response = await request(app)
      .post('/api/mobile/tickets')
      .set('Authorization', 'Bearer user-token')
      .send({
        userId: 999,
        stationCode: 'ST-1',
        sessionId: 44,
        title: 'Blocked charger',
        description: 'A vehicle is parked in the charging bay.',
        priority: 'high',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: ticket });
    expect(ticketService.createTicket).toHaveBeenCalledWith({
      userId: 7,
      stationCode: 'ST-1',
      sessionId: 44,
      title: 'Blocked charger',
      description: 'A vehicle is parked in the charging bay.',
      priority: 'high',
    });
  });
});
