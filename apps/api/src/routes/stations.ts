import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { stations, plugs } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/stations
 * Public. Returns all stations with plug counts.
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: stations.id,
        stationCode: stations.stationCode,
        name: stations.name,
        city: stations.city,
        district: stations.district,
        address: stations.address,
        latitude: stations.latitude,
        longitude: stations.longitude,
        status: stations.status,
        createdAt: stations.createdAt,
        totalPlugs: sql<number>`count(${plugs.id})::int`,
        faultyPlugs: sql<number>`count(${plugs.id}) filter (where ${plugs.status} = 'FAULTY')::int`,
        availablePlugs: sql<number>`count(${plugs.id}) filter (where ${plugs.status} = 'AVAILABLE')::int`,
      })
      .from(stations)
      .leftJoin(plugs, eq(plugs.stationId, stations.id))
      .groupBy(stations.id)
      .orderBy(stations.name);

    res.json(rows);
  } catch (err) {
    console.error('GET /stations error:', err);
    res.status(500).json({ error: 'İstasyonlar yüklenirken hata oluştu.' });
  }
});

/**
 * GET /api/stations/:id
 * Public. Returns a single station with its plugs.
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  try {
    const [station] = await db.select().from(stations).where(eq(stations.id, id)).limit(1);
    if (!station) {
      res.status(404).json({ error: 'İstasyon bulunamadı.' });
      return;
    }

    const stationPlugs = await db
      .select()
      .from(plugs)
      .where(eq(plugs.stationId, id))
      .orderBy(plugs.plugCode);

    res.json({ ...station, plugs: stationPlugs });
  } catch (err) {
    console.error('GET /stations/:id error:', err);
    res.status(500).json({ error: 'İstasyon yüklenirken hata oluştu.' });
  }
});

/**
 * POST /api/stations
 * Admin/Operator only.
 */
router.post('/', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const { stationCode, name, city, district, address, latitude, longitude } = req.body;

  if (!stationCode || !name || !city || latitude == null || longitude == null) {
    res.status(400).json({ error: 'stationCode, name, city, latitude, longitude zorunludur.' });
    return;
  }

  try {
    const [created] = await db
      .insert(stations)
      .values({ stationCode, name, city, district, address, latitude, longitude })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Bu istasyon kodu zaten kullanımda.' });
      return;
    }
    console.error('POST /stations error:', err);
    res.status(500).json({ error: 'İstasyon oluşturulamadı.' });
  }
});

/**
 * PATCH /api/stations/:id
 * Admin/Operator only.
 */
router.patch('/:id', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  const { name, city, district, address, latitude, longitude, status } = req.body;
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (city !== undefined) patch.city = city;
  if (district !== undefined) patch.district = district;
  if (address !== undefined) patch.address = address;
  if (latitude !== undefined) patch.latitude = latitude;
  if (longitude !== undefined) patch.longitude = longitude;
  if (status !== undefined) patch.status = status;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'Güncellenecek en az bir alan gereklidir.' });
    return;
  }

  try {
    const [updated] = await db
      .update(stations)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'İstasyon bulunamadı.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('PATCH /stations/:id error:', err);
    res.status(500).json({ error: 'İstasyon güncellenemedi.' });
  }
});

export default router;
