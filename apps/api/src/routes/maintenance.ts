import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { maintenance, users, stations, plugs } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/maintenance
 * Admin/Operator/Technician. Returns all maintenance records with context.
 */
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'OPERATOR', 'TECHNICIAN'),
  async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: maintenance.id,
          stationId: maintenance.stationId,
          stationName: stations.name,
          plugId: maintenance.plugId,
          plugCode: plugs.plugCode,
          assignedEmployeeId: maintenance.assignedEmployeeId,
          technicianFirstName: users.firstName,
          technicianLastName: users.lastName,
          maintenanceType: maintenance.maintenanceType,
          description: maintenance.description,
          scheduledDate: maintenance.scheduledDate,
          completedDate: maintenance.completedDate,
          status: maintenance.status,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt,
        })
        .from(maintenance)
        .leftJoin(stations, eq(maintenance.stationId, stations.id))
        .leftJoin(plugs, eq(maintenance.plugId, plugs.id))
        .leftJoin(users, eq(maintenance.assignedEmployeeId, users.id))
        .orderBy(desc(maintenance.createdAt));

      const result = rows.map((r) => ({
        ...r,
        technicianName:
          r.technicianFirstName
            ? `${r.technicianFirstName} ${r.technicianLastName}`
            : null,
      }));

      res.json(result);
    } catch (err) {
      console.error('GET /maintenance error:', err);
      res.status(500).json({ error: 'Bakım kayıtları yüklenirken hata oluştu.' });
    }
  },
);

/**
 * POST /api/maintenance
 * Admin/Operator/Technician. Create a maintenance record.
 */
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'OPERATOR', 'TECHNICIAN'),
  async (req, res) => {
    const { stationId, plugId, description, maintenanceType, scheduledDate } = req.body;

    if (!stationId || !description) {
      res.status(400).json({ error: 'stationId ve description zorunludur.' });
      return;
    }

    try {
      const [created] = await db
        .insert(maintenance)
        .values({
          stationId: Number(stationId),
          plugId: plugId ? Number(plugId) : null,
          assignedEmployeeId: req.user!.sub,
          description,
          maintenanceType: maintenanceType ?? null,
          scheduledDate: scheduledDate ?? null,
          status: 'OPEN',
        })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /maintenance error:', err);
      res.status(500).json({ error: 'Bakım kaydı oluşturulamadı.' });
    }
  },
);

/**
 * PATCH /api/maintenance/:id
 * Admin/Operator/Technician. Update status or completedDate.
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'OPERATOR', 'TECHNICIAN'),
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Geçersiz ID.' });
      return;
    }

    const { status, completedDate, description } = req.body;
    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status;
    if (completedDate !== undefined) patch.completedDate = completedDate;
    if (description !== undefined) patch.description = description;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Güncellenecek en az bir alan gereklidir.' });
      return;
    }

    try {
      const [updated] = await db
        .update(maintenance)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(maintenance.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Bakım kaydı bulunamadı.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('PATCH /maintenance/:id error:', err);
      res.status(500).json({ error: 'Bakım kaydı güncellenemedi.' });
    }
  },
);

export default router;
