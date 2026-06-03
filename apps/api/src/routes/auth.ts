import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { employees, users } from '../db/schema';
import { sendError } from '../utils/http';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Derives an application-level role from the presence of an active employee record.
 * All active employees are treated as ADMIN for the web admin panel.
 * Users without an employee record are treated as CUSTOMER.
 */
async function deriveRole(userId: number): Promise<'ADMIN' | 'CUSTOMER'> {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId));
  return employee ? 'ADMIN' : 'CUSTOMER';
}

/** Shared Supabase client factory (publishable key, no session persistence). */
function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * POST /api/auth/login
 * Authenticates via Supabase and returns the Supabase access token
 * alongside the user's profile from the application database.
 *
 * Body: { email: string; password: string }
 * Returns: { token: string; user: { id, email, firstName, lastName, role } }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
    return;
  }

  try {
    const supabase = makeSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      logger.info('auth.login_failed', { email });
      res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
      return;
    }

    const [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.user.email!))
      .limit(1);

    if (!appUser || !appUser.isActive) {
      res.status(401).json({ error: 'Hesabınız bulunamadı veya deaktif edilmiş.' });
      return;
    }

    const role = await deriveRole(appUser.id);
    logger.debug('auth.login_success', { userId: appUser.id, role });

    res.json({
      token: data.session.access_token,
      user: {
        id: appUser.id,
        email: appUser.email,
        firstName: appUser.firstName,
        lastName: appUser.lastName,
        role,
      },
    });
  } catch (err) {
    logger.error('auth.login_error', { message: String(err) });
    sendError(res, err);
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile (works for all authenticated users).
 * Requires a valid Supabase Bearer token in Authorization header.
 */
router.get('/me', async (req, res) => {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: "Yetkilendirme token'ı gereklidir." });
    return;
  }

  try {
    const supabase = makeSupabaseClient();
    const token = authorization.slice(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
      return;
    }

    const [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.user.email))
      .limit(1);

    if (!appUser || !appUser.isActive) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const role = await deriveRole(appUser.id);

    res.json({
      id: appUser.id,
      email: appUser.email,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      role,
      createdAt: appUser.createdAt,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export function createAuthRouter(): Router {
  return router;
}

export default router;
