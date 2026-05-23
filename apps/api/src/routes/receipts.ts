import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { receipts, sessions, plugs, stations } from '@voltops/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/receipts
 * - Staff: all receipts
 * - Customer: only receipts for their own sessions
 */
router.get('/', requireAuth, async (req, res) => {
  const { role, sub: userId } = req.user!;
  const isStaff = role !== 'CUSTOMER';

  try {
    const baseQuery = db
      .select({
        id: receipts.id,
        receiptNo: receipts.receiptNo,
        sessionId: receipts.sessionId,
        stationName: stations.name,
        plugCode: plugs.plugCode,
        plugType: plugs.plugType,
        energyKwh: sessions.energyKwh,
        subtotal: receipts.subtotal,
        taxAmount: receipts.taxAmount,
        totalAmount: receipts.totalAmount,
        currency: receipts.currency,
        paymentMethod: receipts.paymentMethod,
        issuedAt: receipts.issuedAt,
      })
      .from(receipts)
      .innerJoin(sessions, eq(receipts.sessionId, sessions.id))
      .innerJoin(plugs, eq(sessions.plugId, plugs.id))
      .innerJoin(stations, eq(plugs.stationId, stations.id))
      .orderBy(desc(receipts.issuedAt));

    const rows = isStaff
      ? await baseQuery
      : await baseQuery.where(eq(sessions.userId, userId));

    res.json(rows);
  } catch (err) {
    console.error('GET /receipts error:', err);
    res.status(500).json({ error: 'Faturalar yüklenirken hata oluştu.' });
  }
});

/**
 * GET /api/receipts/:id
 * Returns a single receipt by ID. Customer can only access their own.
 */
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  try {
    const [row] = await db
      .select({
        id: receipts.id,
        receiptNo: receipts.receiptNo,
        sessionId: receipts.sessionId,
        userId: sessions.userId,
        stationName: stations.name,
        plugCode: plugs.plugCode,
        plugType: plugs.plugType,
        energyKwh: sessions.energyKwh,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
        subtotal: receipts.subtotal,
        taxAmount: receipts.taxAmount,
        totalAmount: receipts.totalAmount,
        currency: receipts.currency,
        paymentMethod: receipts.paymentMethod,
        issuedAt: receipts.issuedAt,
      })
      .from(receipts)
      .innerJoin(sessions, eq(receipts.sessionId, sessions.id))
      .innerJoin(plugs, eq(sessions.plugId, plugs.id))
      .innerJoin(stations, eq(plugs.stationId, stations.id))
      .where(eq(receipts.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: 'Fatura bulunamadı.' });
      return;
    }

    const { role, sub } = req.user!;
    if (role === 'CUSTOMER' && row.userId !== sub) {
      res.status(403).json({ error: 'Bu faturaya erişim yetkiniz yok.' });
      return;
    }

    res.json(row);
  } catch (err) {
    console.error('GET /receipts/:id error:', err);
    res.status(500).json({ error: 'Fatura yüklenirken hata oluştu.' });
  }
});

export default router;
