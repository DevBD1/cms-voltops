import { db } from '../db/client';
import { SessionService } from './session.service';

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

function updateResult(rows: unknown[]) {
  return {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

describe('SessionService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('rejects a vehicle plate that is not owned by the session user', async () => {
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7, isActive: true }]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([])),
      update: jest.fn(),
      insert: jest.fn(),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new SessionService({ listPlugs: jest.fn() } as never);

    await expect(service.startSession(7, 'PLUG-1', '34ABC123')).rejects.toMatchObject({
      status: 404,
      message: 'Vehicle not found',
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('rejects a second active session for the same user', async () => {
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7, isActive: true }]))
        .mockReturnValueOnce(selectResult([{ id: 99 }])),
      update: jest.fn(),
      insert: jest.fn(),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new SessionService({ listPlugs: jest.fn() } as never);

    await expect(service.startSession(7, 'PLUG-1', '34ABC123')).rejects.toMatchObject({
      status: 409,
      message: 'Active session already exists',
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('returns a conflict when the atomic plug claim finds an existing non-available plug', async () => {
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7, isActive: true }]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([{ plugCode: 'PLUG-1', status: 'in_use' }])),
      update: jest.fn().mockReturnValue(updateResult([])),
      insert: jest.fn(),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new SessionService({ listPlugs: jest.fn() } as never);

    await expect(service.startSession(7, 'PLUG-1')).rejects.toMatchObject({
      status: 409,
      message: 'Plug is not available',
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('passes list filters to the sessions query', async () => {
    const where = jest.fn().mockResolvedValue([]);
    jest.mocked(db.select).mockReturnValue({
      from: jest.fn().mockReturnValue({ where }),
    } as never);

    const service = new SessionService({ listPlugs: jest.fn() } as never);

    await service.listSessions({ userId: 7, status: 'active' });

    expect(where).toHaveBeenCalledTimes(1);
  });

  it('adds a live projection for active sessions', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-04T12:10:00.000Z'));
    const activeSession = {
      id: 1,
      userId: 7,
      plugCode: 'PLUG-1',
      vehiclePlateNumber: '34ABC123',
      startedAt: new Date('2026-06-04T12:00:00.000Z'),
      endedAt: null,
      energyKwh: null,
      durationMinutes: null,
      totalPrice: null,
      status: 'active',
      updatedAt: new Date('2026-06-04T12:00:00.000Z'),
    };
    const where = jest.fn().mockResolvedValue([activeSession]);
    jest
      .mocked(db.select)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where }),
      } as never)
      .mockReturnValueOnce(selectResult([{ id: 7, firstName: 'Burak', lastName: 'Dorman', email: 'b@example.com', phone: null, isActive: true }]) as never)
      .mockReturnValueOnce(selectResult([]) as never);
    const service = new SessionService({
      listPlugs: jest.fn().mockResolvedValue([{ plugCode: 'PLUG-1', powerKw: '120' }]),
    } as never);

    const [session] = await service.listSessions({ userId: 7, status: 'active' });

    expect(session.live).toEqual({
      elapsedSeconds: 600,
      estimatedEnergyKwh: 20,
      estimatedPrice: 180,
      batteryPercent: 46.7,
      chargeSpeedKw: 120,
      currency: 'TRY',
    });
  });

  it('does not add live projection for completed sessions', async () => {
    const completedSession = {
      id: 1,
      userId: 7,
      plugCode: 'PLUG-1',
      vehiclePlateNumber: '34ABC123',
      startedAt: new Date('2026-06-04T12:00:00.000Z'),
      endedAt: new Date('2026-06-04T12:10:00.000Z'),
      energyKwh: '20',
      durationMinutes: '10',
      totalPrice: '180',
      status: 'completed',
      updatedAt: new Date('2026-06-04T12:10:00.000Z'),
    };
    const where = jest.fn().mockResolvedValue([completedSession]);
    jest
      .mocked(db.select)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where }),
      } as never)
      .mockReturnValueOnce(selectResult([{ id: 7, firstName: 'Burak', lastName: 'Dorman', email: 'b@example.com', phone: null, isActive: true }]) as never)
      .mockReturnValueOnce(selectResult([]) as never);
    const service = new SessionService({
      listPlugs: jest.fn().mockResolvedValue([{ plugCode: 'PLUG-1', powerKw: '120' }]),
    } as never);

    const [session] = await service.listSessions({ userId: 7, status: 'completed' });

    expect(session.live).toBeUndefined();
  });

  it('persists the provided energy estimate when ending a session', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-04T12:10:00.000Z'));
    const activeSession = {
      id: 1,
      userId: 7,
      plugCode: 'PLUG-1',
      vehiclePlateNumber: '34ABC123',
      startedAt: new Date('2026-06-04T12:00:00.000Z'),
      status: 'active',
    };
    const updatedSession = {
      ...activeSession,
      endedAt: new Date('2026-06-04T12:10:00.000Z'),
      energyKwh: '20',
      durationMinutes: '10',
      totalPrice: '180',
      status: 'completed',
      updatedAt: new Date('2026-06-04T12:10:00.000Z'),
    };
    const sessionSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedSession]),
      }),
    });
    const plugSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    });
    const receiptValues = jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockResolvedValue([]),
    });
    const tx = {
      select: jest.fn().mockReturnValueOnce(selectResult([activeSession])),
      update: jest.fn().mockReturnValueOnce({ set: sessionSet }).mockReturnValueOnce({ set: plugSet }),
      insert: jest.fn().mockReturnValue({ values: receiptValues }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
    jest
      .mocked(db.select)
      .mockReturnValueOnce(selectResult([{ id: 7, firstName: 'Burak', lastName: 'Dorman', email: 'b@example.com', phone: null, isActive: true }]) as never)
      .mockReturnValueOnce(selectResult([]) as never);
    const service = new SessionService({
      listPlugs: jest.fn().mockResolvedValue([{ plugCode: 'PLUG-1', powerKw: '120' }]),
    } as never);

    const session = await service.endSession(1, 20, 7);

    expect(sessionSet).toHaveBeenCalledWith(
      expect.objectContaining({
        energyKwh: '20',
        durationMinutes: '10',
        totalPrice: '180',
        status: 'completed',
      }),
    );
    expect(receiptValues).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: '150',
        taxAmount: '30',
        totalAmount: '180',
      }),
    );
    expect(session.live).toBeUndefined();
  });
});
