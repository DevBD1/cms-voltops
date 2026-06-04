import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, userVehicles, users, vehicles } from '../db/schema';
import { HttpError } from '../utils/http';

export type ConnectorType = 'CCS' | 'Type-2' | 'CHAdeMO';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbReader = Pick<typeof db, 'select'>;

export const allowedConnectorTypes: ConnectorType[] = ['CCS', 'Type-2', 'CHAdeMO'];

export function normalizePlateNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function assertValidPlateNumber(plateNumber: string): void {
  if (plateNumber.length < 2 || plateNumber.length > 20 || !/^[A-Z0-9-]+$/.test(plateNumber)) {
    throw new HttpError(400, 'plateNumber must be 2-20 chars using A-Z, 0-9, or -');
  }
}

export class VehicleService {
  async addVehicle(userId: number, input: { plateNumber: string; connectorType: ConnectorType }) {
    const plateNumber = normalizePlateNumber(input.plateNumber);
    assertValidPlateNumber(plateNumber);

    return db.transaction(async (tx) => {
      await this.assertUserExists(tx, userId);

      const existingLinks = await tx.select().from(userVehicles).where(eq(userVehicles.userId, userId));
      const existingLink = existingLinks.find((link) => link.vehiclePlateNumber === plateNumber);

      if (existingLink) {
        throw new HttpError(409, 'Vehicle already linked to current user');
      }

      await tx.insert(vehicles).values({ plateNumber, connectorType: input.connectorType }).onConflictDoNothing();
      const [createdLink] = await tx
        .insert(userVehicles)
        .values({
          userId,
          vehiclePlateNumber: plateNumber,
          relationshipType: 'owner',
          isPrimary: existingLinks.length === 0,
        })
        .onConflictDoNothing()
        .returning();

      if (!createdLink) {
        throw new HttpError(409, 'Vehicle already linked to current user');
      }

      return this.getProfile(userId, tx);
    });
  }

  async removeVehicle(userId: number, plateNumberInput: string) {
    const plateNumber = normalizePlateNumber(plateNumberInput);
    assertValidPlateNumber(plateNumber);

    return db.transaction(async (tx) => {
      const [activeSession] = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.vehiclePlateNumber, plateNumber), eq(sessions.status, 'active')));

      if (activeSession) {
        throw new HttpError(409, 'Vehicle has an active session');
      }

      const [removedLink] = await tx
        .delete(userVehicles)
        .where(and(eq(userVehicles.userId, userId), eq(userVehicles.vehiclePlateNumber, plateNumber)))
        .returning();

      if (!removedLink) {
        throw new HttpError(404, 'Vehicle link not found');
      }

      if (removedLink.isPrimary) {
        const remainingUserLinks = await tx
          .select()
          .from(userVehicles)
          .where(eq(userVehicles.userId, userId))
          .orderBy(asc(userVehicles.id));
        const nextPrimary = remainingUserLinks[0];

        if (nextPrimary) {
          await tx.update(userVehicles).set({ isPrimary: true }).where(eq(userVehicles.id, nextPrimary.id));
        }
      }

      const [remainingLink] = await tx.select({ id: userVehicles.id }).from(userVehicles).where(eq(userVehicles.vehiclePlateNumber, plateNumber));
      const [referencedSession] = await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.vehiclePlateNumber, plateNumber));

      if (!remainingLink && !referencedSession) {
        await tx.delete(vehicles).where(eq(vehicles.plateNumber, plateNumber));
      }

      return this.getProfile(userId, tx);
    });
  }

  private async assertUserExists(tx: Transaction, userId: number): Promise<void> {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new HttpError(404, 'User not found');
    }
  }

  private async getProfile(userId: number, client: DbReader = db) {
    const [user] = await client.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const ownedVehicles = await client
      .select({
        id: userVehicles.id,
        relationshipType: userVehicles.relationshipType,
        isPrimary: userVehicles.isPrimary,
        plateNumber: vehicles.plateNumber,
        connectorType: vehicles.connectorType,
      })
      .from(userVehicles)
      .innerJoin(vehicles, eq(userVehicles.vehiclePlateNumber, vehicles.plateNumber))
      .where(eq(userVehicles.userId, userId));

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      vehicles: ownedVehicles,
    };
  }
}
