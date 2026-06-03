import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { employees, maintenance, plugs, stations, users } from '../db/schema';
import { HttpError } from '../utils/http';

type MaintenanceRow = typeof maintenance.$inferSelect;

export interface MaintenanceView {
  id: number;
  stationCode: string;
  stationName: string | null;
  plugCode: string | null;
  employeeId: number | null;
  technicianName: string | null;
  maintenanceType: string;
  description: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaintenanceInput {
  stationCode: string;
  plugCode?: string;
  employeeId?: number;
  maintenanceType: string;
  description: string;
  scheduledDate?: string;
}

export interface UpdateMaintenanceInput {
  status?: string;
  completedDate?: string;
  description?: string;
  employeeId?: number;
}

async function enrich(row: MaintenanceRow): Promise<MaintenanceView> {
  const [stationRow, plugRow, employeeRow] = await Promise.all([
    row.stationCode
      ? db.select({ name: stations.name }).from(stations).where(eq(stations.stationCode, row.stationCode)).limit(1)
      : Promise.resolve([]),
    row.plugCode
      ? db.select({ plugCode: plugs.plugCode }).from(plugs).where(eq(plugs.plugCode, row.plugCode)).limit(1)
      : Promise.resolve([]),
    row.employeeId
      ? db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .where(eq(employees.id, row.employeeId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const stationName = (stationRow[0] as { name: string } | undefined)?.name ?? null;
  const technicianName =
    employeeRow[0]
      ? `${(employeeRow[0] as { firstName: string; lastName: string }).firstName} ${(employeeRow[0] as { firstName: string; lastName: string }).lastName}`.trim()
      : null;

  return {
    id: row.id,
    stationCode: row.stationCode,
    stationName,
    plugCode: row.plugCode ?? null,
    employeeId: row.employeeId ?? null,
    technicianName,
    maintenanceType: row.maintenanceType,
    description: row.description,
    scheduledDate: row.scheduledDate ?? null,
    completedDate: row.completedDate ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class MaintenanceService {
  async listMaintenance(filters?: { status?: string; stationCode?: string }): Promise<MaintenanceView[]> {
    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(maintenance.status, filters.status));
    if (filters?.stationCode) conditions.push(eq(maintenance.stationCode, filters.stationCode));

    const query = db.select().from(maintenance).orderBy(maintenance.createdAt);
    const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    return Promise.all(rows.map(enrich));
  }

  async createMaintenance(input: CreateMaintenanceInput): Promise<MaintenanceView> {
    const [station] = await db
      .select({ stationCode: stations.stationCode })
      .from(stations)
      .where(eq(stations.stationCode, input.stationCode))
      .limit(1);

    if (!station) throw new HttpError(404, 'Station not found');

    const [row] = await db
      .insert(maintenance)
      .values({
        stationCode: input.stationCode,
        plugCode: input.plugCode ?? null,
        employeeId: input.employeeId ?? null,
        maintenanceType: input.maintenanceType,
        description: input.description,
        scheduledDate: input.scheduledDate ?? null,
        status: 'scheduled',
      })
      .returning();

    return enrich(row);
  }

  async updateMaintenance(id: number, input: UpdateMaintenanceInput): Promise<MaintenanceView> {
    const [row] = await db
      .update(maintenance)
      .set({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
        updatedAt: new Date(),
      })
      .where(eq(maintenance.id, id))
      .returning();

    if (!row) throw new HttpError(404, 'Maintenance record not found');
    return enrich(row);
  }
}
