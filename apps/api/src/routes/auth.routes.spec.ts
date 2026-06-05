import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import { db } from '../db/client';
import { createAuthRouter } from './auth';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.requestId = 'test-request-id';
    next();
  });
  app.use('/api/auth', createAuthRouter());
  return app;
}

describe('createAuthRouter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  });

  it('rejects login when Supabase returns a user without email', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        session: { access_token: 'test-token' },
        user: { id: 'auth-user-1' },
      },
      error: null,
    });
    jest.mocked(createClient).mockReturnValue({
      auth: { signInWithPassword },
    } as never);
    const app = createTestApp();

    const response = await request(app).post('/api/auth/login').send({
      email: 'phone-only@example.com',
      password: 'secret',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Geçersiz kimlik bilgileri.' });
    expect(db.select).not.toHaveBeenCalled();
  });

  it('rejects /me when Supabase returns a user without email', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: {
        user: { id: 'auth-user-1' },
      },
      error: null,
    });
    jest.mocked(createClient).mockReturnValue({
      auth: { getUser },
    } as never);
    const app = createTestApp();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Geçersiz veya süresi dolmuş token.',
    });
    expect(db.select).not.toHaveBeenCalled();
  });
});
