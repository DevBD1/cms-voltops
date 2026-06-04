import { db } from '../db/client';
import { VehicleService } from './vehicle.service';

jest.mock('../db/client', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
  },
}));

function selectResult(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(rows),
    }),
  };
}

function orderedSelectResult(rows: unknown[]) {
  const orderBy = jest.fn().mockResolvedValue(rows);

  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ orderBy }),
    }),
    orderBy,
  };
}

function profileVehicleResult(vehicleRows: unknown[] = []) {
  return {
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(vehicleRows),
      }),
    }),
  };
}

function profileUserResult() {
  return selectResult([
    {
      id: 7,
      firstName: 'Burak',
      lastName: 'Dorman',
      email: 'burak@example.com',
      phone: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ]);
}

describe('VehicleService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects invalid plate numbers', async () => {
    const service = new VehicleService();

    await expect(service.addVehicle(7, { plateNumber: '?', connectorType: 'CCS' })).rejects.toMatchObject({
      status: 400,
      message: 'plateNumber must be 2-20 chars using A-Z, 0-9, or -',
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('marks the first user vehicle as primary and returns the transaction-scoped profile', async () => {
    const vehicleValues = jest.fn().mockReturnValue({ onConflictDoNothing: jest.fn().mockResolvedValue(undefined) });
    const linkReturning = jest.fn().mockResolvedValue([{ id: 1 }]);
    const linkValues = jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockReturnValue({
        returning: linkReturning,
      }),
    });
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7 }]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(profileUserResult())
        .mockReturnValueOnce(profileVehicleResult([{ plateNumber: '34ABC123', connectorType: 'CCS', isPrimary: true }])),
      insert: jest.fn().mockReturnValueOnce({ values: vehicleValues }).mockReturnValueOnce({ values: linkValues }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new VehicleService();

    const profile = await service.addVehicle(7, { plateNumber: '34 abc 123', connectorType: 'CCS' });

    expect(vehicleValues).toHaveBeenCalledWith({ plateNumber: '34ABC123', connectorType: 'CCS' });
    expect(linkValues).toHaveBeenCalledWith({
      userId: 7,
      vehiclePlateNumber: '34ABC123',
      relationshipType: 'owner',
      isPrimary: true,
    });
    expect(profile.vehicles).toEqual([{ plateNumber: '34ABC123', connectorType: 'CCS', isPrimary: true }]);
    expect(tx.select).toHaveBeenCalledTimes(4);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('rejects duplicate user vehicle links', async () => {
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7 }]))
        .mockReturnValueOnce(selectResult([{ vehiclePlateNumber: '34ABC123' }])),
      insert: jest.fn(),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new VehicleService();

    await expect(service.addVehicle(7, { plateNumber: '34ABC123', connectorType: 'CCS' })).rejects.toMatchObject({
      status: 409,
      message: 'Vehicle already linked to current user',
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('blocks removal when the vehicle has an active session for the user', async () => {
    const tx = {
      select: jest.fn().mockReturnValueOnce(selectResult([{ id: 99 }])),
      delete: jest.fn(),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new VehicleService();

    await expect(service.removeVehicle(7, '34ABC123')).rejects.toMatchObject({
      status: 409,
      message: 'Vehicle has an active session',
    });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('promotes the oldest remaining vehicle when removing the primary vehicle', async () => {
    const deleteReturning = jest.fn().mockResolvedValue([{ id: 1, isPrimary: true }]);
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const remainingLinksResult = orderedSelectResult([{ id: 2 }]);
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(remainingLinksResult)
        .mockReturnValueOnce(selectResult([{ id: 2 }]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(profileUserResult())
        .mockReturnValueOnce(profileVehicleResult([{ plateNumber: '35DEF456', connectorType: 'Type-2', isPrimary: true }])),
      delete: jest.fn().mockReturnValueOnce({ where: jest.fn().mockReturnValue({ returning: deleteReturning }) }),
      update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: updateWhere }) }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new VehicleService();

    const profile = await service.removeVehicle(7, '34ABC123');

    expect(remainingLinksResult.orderBy).toHaveBeenCalledTimes(1);
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(profile.vehicles).toEqual([{ plateNumber: '35DEF456', connectorType: 'Type-2', isPrimary: true }]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('deletes orphan vehicles only when no links or sessions remain', async () => {
    const deleteReturning = jest.fn().mockResolvedValue([{ id: 1, isPrimary: false }]);
    const vehicleDeleteWhere = jest.fn().mockResolvedValue(undefined);
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(profileUserResult())
        .mockReturnValueOnce(profileVehicleResult([])),
      delete: jest
        .fn()
        .mockReturnValueOnce({ where: jest.fn().mockReturnValue({ returning: deleteReturning }) })
        .mockReturnValueOnce({ where: vehicleDeleteWhere }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new VehicleService();

    const profile = await service.removeVehicle(7, '34ABC123');

    expect(vehicleDeleteWhere).toHaveBeenCalledTimes(1);
    expect(profile.vehicles).toEqual([]);
  });
});
