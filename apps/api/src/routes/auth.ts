import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '@voltops/db';
import { requireAuth, signToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.sub))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
