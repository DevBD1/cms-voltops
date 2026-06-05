import express from 'express';
import request from 'supertest';
import { createAdminRouter } from './admin.routes';
import { HttpError } from '../utils/http';

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

describe('createAdminRouter', () => {
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
});
