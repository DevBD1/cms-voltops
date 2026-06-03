import { Router } from 'express';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { employees, users } from '../db/schema';
import { sendError } from '../utils/http';
import { logger } from '../utils/logger';

const router = Router();

/** Shared Supabase client factory (publishable key, no session persistence). */
function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Derives first/last name from Supabase user metadata.
 * Falls back to the email prefix when no name metadata is present.
 */
function nameFromSupabaseUser(supabaseUser: SupabaseUser) {
  const meta = supabaseUser.user_metadata ?? {};
  const firstName = typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  const lastName  = typeof meta.last_name  === 'string' ? meta.last_name.trim()  : '';

  if (firstName || lastName) return { firstName: firstName || 'User', lastName };

  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) {
    const [first, ...rest] = fullName.split(/\s+/);
    return { firstName: first || 'User', lastName: rest.join(' ') };
  }

  // Last resort: use the part of the email before @
  return { firstName: supabaseUser.email?.split('@')[0] ?? 'User', lastName: '' };
}

/**
 * Finds the public.users row that matches the Supabase Auth user.
 * Creates it automatically on first login — mirrors AuthService.findOrCreateUser.
 */
async function findOrCreateAppUser(supabaseUser: SupabaseUser) {
  // 1. Try by Supabase Auth UUID (fastest path after first login)
  const [byAuthId] = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, supabaseUser.id))
    .limit(1);
  if (byAuthId) return byAuthId;

  // 2. Try by email (user may exist from a previous auth method)
  const [byEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, supabaseUser.email!))
    .limit(1);

  if (byEmail) {
    // Link the Supabase UUID so future lookups hit path 1
    const [linked] = await db
      .update(users)
      .set({ authUserId: supabaseUser.id, updatedAt: new Date() })
      .where(eq(users.id, byEmail.id))
      .returning();
    return linked;
  }

  // 3. First-ever login — create the row
  const { firstName, lastName } = nameFromSupabaseUser(supabaseUser);
  const [created] = await db
    .insert(users)
    .values({
      authUserId: supabaseUser.id,
      firstName,
      lastName,
      email: supabaseUser.email!,
      phone: supabaseUser.phone ?? null,
      isActive: true,
      termsOfService: new Date(),
    })
    .returning();

  logger.debug('auth.app_user_created', { userId: created.id, email: created.email });
  return created;
}

/**
 * Derives an application-level role from the presence of an active employee record.
 * Employee present → ADMIN (admin dashboard).
 * No employee record → CUSTOMER (customer portal).
 */
async function deriveRole(userId: number): Promise<'ADMIN' | 'CUSTOMER'> {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId));
  return employee ? 'ADMIN' : 'CUSTOMER';
}

/**
 * POST /api/auth/login
 * Authenticates via Supabase, auto-creates public.users on first login,
 * and returns the Supabase access token + app-level user profile.
 *
 * Body:    { email: string; password: string }
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

    // Auto-creates public.users row on first login
    const appUser = await findOrCreateAppUser(data.user);

    if (!appUser.isActive) {
      res.status(401).json({ error: 'Hesabınız deaktif edilmiş.' });
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
 * Returns the authenticated user's profile.
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

    const appUser = await findOrCreateAppUser(data.user);

    if (!appUser.isActive) {
      res.status(401).json({ error: 'Hesabınız deaktif edilmiş.' });
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
