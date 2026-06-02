import { Router } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { sessions, plugs, users, stations } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/sessions
 * - Admin/Operator/Technician: returns all sessions
 * - Customer: returns only their own sessions
 * Joined with user, plug, and station names for display.
 */
router.get('/', requireAuth, async (req, res) => {
  const { role, sub: userId } = req.user!;
  const isStaff = role !== 'CUSTOMER';

  try {
    const query = db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userFullName: users.firstName,
        userLastName: users.lastName,
        plugId: sessions.plugId,
        plugCode: plugs.plugCode,
        plugType: plugs.plugType,
        stationName: stations.name,
        stationId: stations.id,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
        energyKwh: sessions.energyKwh,
        totalPrice: sessions.totalPrice,
        status: sessions.status,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(plugs, eq(sessions.plugId, plugs.id))
      .innerJoin(stations, eq(plugs.stationId, stations.id))
      .orderBy(desc(sessions.startedAt));

    const rows = isStaff ? await query : await query.where(eq(sessions.userId, userId));

    // Combine firstName + lastName for display
    const result = rows.map((r) => ({
      ...r,
      userFullName: `${r.userFullName} ${r.userLastName}`,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /sessions error:', err);
    res.status(500).json({ error: 'Seanslar yüklenirken hata oluştu.' });
  }
});

/**
 * POST /api/sessions
 * Customer/Operator: Start a new charging session.
 * Body: { plugId: number }
 */
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user!.sub;
  const { plugId } = req.body as { plugId?: number };

  if (!plugId) {
    res.status(400).json({ error: 'plugId zorunludur.' });
    return;
  }

  try {
    // Lock the plug row and re-check availability inside the transaction so two
    // concurrent requests can't both pass the guard and double-book the plug.
    const result = await db.transaction(async (tx) => {
      const [plug] = await tx
        .select()
        .from(plugs)
        .where(eq(plugs.id, plugId))
        .limit(1)
        .for('update');

      if (!plug) {
        return { error: { code: 404, message: 'Soket bulunamadı.' } } as const;
      }
      if (plug.status !== 'AVAILABLE') {
        return { error: { code: 409, message: 'Soket şu anda müsait değil.' } } as const;
      }

      await tx
        .update(plugs)
        .set({ status: 'CHARGING', updatedAt: new Date() })
        .where(eq(plugs.id, plugId));

      const [session] = await tx
        .insert(sessions)
        .values({
          userId,
          plugId,
          startedAt: new Date(),
          status: 'ACTIVE',
        })
        .returning();

      return { session } as const;
    });

    if ('error' in result) {
      res.status(result.error.code).json({ error: result.error.message });
      return;
    }

    res.status(201).json(result.session);
  } catch (err) {
    console.error('POST /sessions error:', err);
    res.status(500).json({ error: 'Seans başlatılamadı.' });
  }
});

/**
 * PATCH /api/sessions/:id/end
 * End an active session and free the plug.
 * Body: { energyKwh: number; totalPrice: number }
 */
router.patch('/:id/end', requireAuth, async (req, res) => {
  const sessionId = Number(req.params.id);
  const { energyKwh, totalPrice } = req.body as {
    energyKwh?: number;
    totalPrice?: number;
  };

  if (isNaN(sessionId) || energyKwh == null || totalPrice == null) {
    res.status(400).json({ error: 'sessionId, energyKwh ve totalPrice zorunludur.' });
    return;
  }

  if (
    typeof energyKwh !== 'number' ||
    typeof totalPrice !== 'number' ||
    !Number.isFinite(energyKwh) ||
    !Number.isFinite(totalPrice)
  ) {
    res.status(400).json({ error: 'energyKwh ve totalPrice geçerli sayılar olmalıdır.' });
    return;
  }

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), isNull(sessions.endedAt)))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: 'Aktif seans bulunamadı.' });
      return;
    }

    // Only the owner or staff can end a session
    if (req.user!.role === 'CUSTOMER' && session.userId !== req.user!.sub) {
      res.status(403).json({ error: 'Bu seansı sonlandırma yetkiniz yok.' });
      return;
    }

    const [ended] = await db.transaction(async (tx) => {
      await tx
        .update(plugs)
        .set({ status: 'AVAILABLE', updatedAt: new Date() })
        .where(eq(plugs.id, session.plugId));

      return tx
        .update(sessions)
        .set({
          endedAt: new Date(),
          energyKwh: energyKwh.toFixed(3),
          totalPrice: totalPrice.toFixed(2),
          status: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();
    });

    res.json(ended);
  } catch (err) {
    console.error('PATCH /sessions/:id/end error:', err);
    res.status(500).json({ error: 'Seans sonlandırılamadı.' });
  }
});

export default router;
