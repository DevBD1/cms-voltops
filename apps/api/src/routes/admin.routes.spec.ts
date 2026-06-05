import express from 'express';
import request from 'supertest';
import { createAdminRouter } from './admin.routes';
import { db } from '../db/client';
import { HttpError } from '../utils/http';

jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

function createTestApp(authService: { authenticateAdmin: jest.Mock }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.locals.requestId = 'test-request-id';
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(
    '/api/admin',
    createAdminRouter(
      authService as never,
      {
        listStations: jest.fn().mockResolvedValue([]),
        listPlugs: jest.fn().mockResolvedValue([]),
      } as never,
      {
        listSessions: jest.fn().mockResolvedValue([]),
      } as never,
      {
        listTickets: jest.fn().mockResolvedValue([]),
      } as never,
    ),
  );
  return app;
}

function limitedSelectResult(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function ticketListResult(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn().mockResolvedValue(rows),
  };

  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);

  return builder;
}

describe('createAdminRouter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 without an admin bearer token', async () => {
    const app = createTestApp({
      authenticateAdmin: jest
        .fn()
        .mockRejectedValue(
          new HttpError(401, 'Authorization bearer token is required'),
        ),
    });

    const response = await request(app).get('/api/admin/dashboard');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Authorization bearer token is required',
    });
  });

  it('returns 403 for authenticated users without active employee access', async () => {
    const app = createTestApp({
      authenticateAdmin: jest
        .fn()
        .mockRejectedValue(
          new HttpError(403, 'Active employee access is required'),
        ),
    });

    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'Active employee access is required',
    });
  });

  it('allows active employees to load the dashboard', async () => {
    const app = createTestApp({
      authenticateAdmin: jest
        .fn()
        .mockResolvedValue({ appUser: { id: 1 }, employee: { id: 10 } }),
    });

    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        stations: 0,
        activeStations: 0,
        plugs: 0,
        availablePlugs: 0,
        activeSessions: 0,
        openTickets: 0,
      },
    });
  });

  it('returns 204 for preflight requests before admin auth', async () => {
    const app = createTestApp({
      authenticateAdmin: jest.fn(),
    });

    const response = await request(app).options('/api/admin/dashboard');

    expect(response.status).toBe(204);
  });

  it('creates an employee without requiring an explicit employee code', async () => {
    const authService = {
      authenticateAdmin: jest
        .fn()
        .mockResolvedValue({ appUser: { id: 1 }, employee: { id: 10 } }),
    };
    const values = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([
        {
          id: 1,
          userId: 7,
          employeeCode: 'EMP-0001',
          department: 'Operations',
          jobTitle: 'Dispatcher',
          hireDate: '2026-06-01',
          status: 'active',
        },
      ]),
    });
    jest
      .mocked(db.select)
      .mockReturnValueOnce(
        limitedSelectResult([
          {
            id: 7,
            firstName: 'Ada',
            lastName: 'Yilmaz',
            email: 'ada@example.com',
          },
        ]) as never,
      )
      .mockReturnValueOnce(limitedSelectResult([]) as never);
    jest.mocked(db.insert).mockReturnValueOnce({ values } as never);
    const app = createTestApp(authService);

    const response = await request(app)
      .post('/api/admin/employees')
      .set('Authorization', 'Bearer admin-token')
      .send({
        userId: 7,
        department: 'Operations',
        jobTitle: 'Dispatcher',
        hireDate: '2026-06-01',
      });

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        department: 'Operations',
        jobTitle: 'Dispatcher',
      }),
    );
    expect(response.body.data.employeeCode).toBe('EMP-0001');
  });

  it('normalizes missing ticket status and priority values without crashing', async () => {
    const authService = {
      authenticateAdmin: jest
        .fn()
        .mockResolvedValue({ appUser: { id: 1 }, employee: { id: 10 } }),
    };
    jest.mocked(db.select).mockReturnValueOnce(
      ticketListResult([
        {
          id: 12,
          userId: 7,
          userFirstName: 'Mert',
          userLastName: 'Kaya',
          stationCode: 'ST-1',
          stationName: 'Moda Rapid Hub',
          assignedEmployeeId: null,
          title: 'Cable issue',
          description: 'Cable latch felt loose.',
          priority: null,
          status: null,
          createdAt: new Date('2026-06-05T10:00:00.000Z'),
          updatedAt: new Date('2026-06-05T10:00:00.000Z'),
        },
        {
          id: 13,
          userId: 8,
          userFirstName: 'Ece',
          userLastName: 'Demir',
          stationCode: 'ST-2',
          stationName: 'Besiktas Marina Charge',
          assignedEmployeeId: 3,
          title: 'Unknown priority',
          description: 'Unknown values should still be uppercased.',
          priority: ' urgent ',
          status: 'waiting',
          createdAt: new Date('2026-06-05T11:00:00.000Z'),
          updatedAt: new Date('2026-06-05T11:00:00.000Z'),
        },
      ]) as never,
    );
    const app = createTestApp(authService);

    const response = await request(app)
      .get('/api/admin/tickets')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: 12,
        priority: 'MEDIUM',
        status: 'OPEN',
      }),
    );
    expect(response.body.data[1]).toEqual(
      expect.objectContaining({
        id: 13,
        priority: 'URGENT',
        status: 'WAITING',
      }),
    );
  });
});
