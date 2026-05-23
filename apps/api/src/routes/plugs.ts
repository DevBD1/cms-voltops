import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { plugs, stations } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/plugs
 * Public. Returns all plugs with their station name.
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: plugs.id,
        plugCode: plugs.plugCode,
        stationId: plugs.stationId,
        stationName: stations.name,
        stationCode: stations.stationCode,
        city: stations.city,
        plugType: plugs.plugType,
        powerKw: plugs.powerKw,
        currentType: plugs.currentType,
        status: plugs.status,
        updatedAt: plugs.updatedAt,
      })
      .from(plugs)
      .innerJoin(stations, eq(plugs.stationId, stations.id))
      .orderBy(stations.name, plugs.plugCode);

    res.json(rows);
  } catch (err) {
    console.error('GET /plugs error:', err);
    res.status(500).json({ error: 'Soketler yüklenirken hata oluştu.' });
  }
});

/**
 * GET /api/stations/:stationId/plugs
 * Public. Returns plugs belonging to a specific station.
 */
router.get('/by-station/:stationId', async (req, res) => {
  const stationId = Number(req.params.stationId);
  if (isNaN(stationId)) {
    res.status(400).json({ error: 'Geçersiz istasyon ID.' });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(plugs)
      .where(eq(plugs.stationId, stationId))
      .orderBy(plugs.plugCode);

    res.json(rows);
  } catch (err) {
    console.error('GET /plugs/by-station/:stationId error:', err);
    res.status(500).json({ error: 'Soketler yüklenirken hata oluştu.' });
  }
});

/**
 * POST /api/plugs
 * Admin/Operator only. Add a plug to a station.
 */
router.post('/', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const { plugCode, stationId, plugType, powerKw, currentType } = req.body;

  if (!plugCode || !stationId || !plugType || powerKw == null || !currentType) {
    res
      .status(400)
      .json({ error: 'plugCode, stationId, plugType, powerKw, currentType zorunludur.' });
    return;
  }

  try {
    const [created] = await db
      .insert(plugs)
      .values({ plugCode, stationId: Number(stationId), plugType, powerKw, currentType })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Bu soket kodu zaten kullanımda.' });
      return;
    }
    console.error('POST /plugs error:', err);
    res.status(500).json({ error: 'Soket oluşturulamadı.' });
  }
});

/**
 * PATCH /api/plugs/:id/status
 * Admin/Operator/Technician. Update plug status.
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN', 'OPERATOR', 'TECHNICIAN'),
  async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: string };

    if (isNaN(id) || !status) {
      res.status(400).json({ error: 'Geçerli bir ID ve status gereklidir.' });
      return;
    }

    const allowed = ['AVAILABLE', 'CHARGING', 'FAULTY', 'RESERVED'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `Geçerli durumlar: ${allowed.join(', ')}` });
      return;
    }

    try {
      const [updated] = await db
        .update(plugs)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(plugs.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Soket bulunamadı.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('PATCH /plugs/:id/status error:', err);
      res.status(500).json({ error: 'Soket durumu güncellenemedi.' });
    }
  },
);

export default router;
