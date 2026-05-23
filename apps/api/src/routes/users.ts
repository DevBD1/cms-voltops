import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/** Columns safe to return to clients (excludes passwordHash). */
const safeColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

/**
 * GET /api/users
 * Admin/Operator only. Returns all users.
 */
router.get('/', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (_req, res) => {
  try {
    const rows = await db.select(safeColumns).from(users).orderBy(users.createdAt);
    res.json(rows);
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Kullanıcılar yüklenirken hata oluştu.' });
  }
});

/**
 * GET /api/users/:id
 * Admin/Operator or the user themselves.
 */
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  const { sub, role } = req.user!;
  if (role === 'CUSTOMER' && sub !== id) {
    res.status(403).json({ error: 'Bu kullanıcıya erişim yetkiniz yok.' });
    return;
  }

  try {
    const [user] = await db.select(safeColumns).from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ error: 'Kullanıcı yüklenirken hata oluştu.' });
  }
});

/**
 * POST /api/users
 * Public. Register a new customer account.
 * Body: { firstName, lastName, email, password, phone? }
 */
router.post('/', async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ error: 'firstName, lastName, email ve password zorunludur.' });
    return;
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const [created] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        passwordHash,
        phone: phone ?? null,
        role: 'CUSTOMER',
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
      return;
    }
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
  }
});

/**
 * PATCH /api/users/:id
 * User can update their own profile; Admin can update anyone.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  const { sub, role } = req.user!;
  if (role === 'CUSTOMER' && sub !== id) {
    res.status(403).json({ error: 'Başka bir kullanıcıyı güncelleyemezsiniz.' });
    return;
  }

  const { firstName, lastName, phone, isActive } = req.body;
  const patch: Record<string, unknown> = {};
  if (firstName !== undefined) patch.firstName = firstName;
  if (lastName !== undefined) patch.lastName = lastName;
  if (phone !== undefined) patch.phone = phone;
  // Only admin can deactivate
  if (isActive !== undefined && role === 'ADMIN') patch.isActive = isActive;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'Güncellenecek en az bir alan gereklidir.' });
    return;
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('PATCH /users/:id error:', err);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi.' });
  }
});

export default router;
