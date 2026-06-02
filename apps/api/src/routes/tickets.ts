import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { tickets, users, stations } from '@voltops/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/tickets
 * - Admin/Operator/Technician: all tickets
 * - Customer: only their own tickets
 */
router.get('/', requireAuth, async (req, res) => {
  const { role, sub: userId } = req.user!;
  const isStaff = role !== 'CUSTOMER';

  try {
    const baseQuery = db
      .select({
        id: tickets.id,
        userId: tickets.userId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        stationId: tickets.stationId,
        stationName: stations.name,
        title: tickets.title,
        description: tickets.description,
        priority: tickets.priority,
        status: tickets.status,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .leftJoin(stations, eq(tickets.stationId, stations.id))
      .orderBy(desc(tickets.createdAt));

    const rows = isStaff ? await baseQuery : await baseQuery.where(eq(tickets.userId, userId));

    const result = rows.map((r) => ({
      ...r,
      userFullName: `${r.userFirstName} ${r.userLastName}`,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /tickets error:', err);
    res.status(500).json({ error: 'Talepler yüklenirken hata oluştu.' });
  }
});

/**
 * POST /api/tickets
 * Any authenticated user can open a ticket.
 * Body: { title, description, priority?, stationId? }
 */
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user!.sub;
  const { title, description, priority, stationId } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: 'title ve description zorunludur.' });
    return;
  }

  try {
    const [created] = await db
      .insert(tickets)
      .values({
        userId,
        title,
        description,
        priority: priority ?? 'MEDIUM',
        stationId: stationId ? Number(stationId) : null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /tickets error:', err);
    res.status(500).json({ error: 'Talep oluşturulamadı.' });
  }
});

/**
 * PATCH /api/tickets/:id
 * Admin/Operator/Technician: update status or assign.
 * Customer: can update description/title on their own OPEN tickets only.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Geçersiz ID.' });
    return;
  }

  try {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!ticket) {
      res.status(404).json({ error: 'Talep bulunamadı.' });
      return;
    }

    const { role, sub } = req.user!;
    const isStaff = role !== 'CUSTOMER';

    if (!isStaff && ticket.userId !== sub) {
      res.status(403).json({ error: 'Bu talebi güncelleme yetkiniz yok.' });
      return;
    }

    const { status, priority, assignedEmployeeId, title, description } = req.body;
    const patch: Record<string, unknown> = {};

    if (isStaff) {
      if (status !== undefined) patch.status = status;
      if (priority !== undefined) patch.priority = priority;
      if (assignedEmployeeId !== undefined)
        patch.assignedEmployeeId = Number(assignedEmployeeId);
    } else {
      // Customers may only edit title/description on their own OPEN tickets.
      if (ticket.status !== 'OPEN') {
        res.status(403).json({ error: 'Yalnızca açık talepler düzenlenebilir.' });
        return;
      }
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Güncellenecek en az bir alan gereklidir.' });
      return;
    }

    const [updated] = await db
      .update(tickets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error('PATCH /tickets/:id error:', err);
    res.status(500).json({ error: 'Talep güncellenemedi.' });
  }
});

export default router;
