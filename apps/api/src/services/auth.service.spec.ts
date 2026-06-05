import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client';
import { AuthService } from './auth.service';

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

type AuthServiceWithPrivateGuard = {
  findOrCreateUser(
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, unknown>;
    },
    requestId?: string,
  ): Promise<unknown>;
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
    jest.mocked(createClient).mockReturnValue({
      auth: { getUser: jest.fn() },
    } as never);
  });

  it('rejects Supabase users without email before app-user lookup', async () => {
    const service = new AuthService() as unknown as AuthServiceWithPrivateGuard;

    await expect(
      service.findOrCreateUser({ id: 'auth-user-1', email: null }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid Supabase auth token',
    });
    expect(db.select).not.toHaveBeenCalled();
  });
});
