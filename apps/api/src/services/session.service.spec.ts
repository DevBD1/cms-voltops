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

function joinedSelectResult(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn().mockResolvedValue(rows),
    orderBy: jest.fn().mockResolvedValue(rows),
  };

  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);

  return builder;
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

function sessionContextRow(sessionOverrides: Record<string, unknown> = {}, receipt: Record<string, unknown> | null = null) {
  const session = {
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
    ...sessionOverrides,
  };

  return {
    session,
    user: {
      id: 7,
      firstName: 'Burak',
      lastName: 'Dorman',
      email: 'b@example.com',
      phone: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    plug: {
      plugCode: 'PLUG-1',
      stationCode: 'ST-1',
      plugType: 'CCS',
      powerKw: '120',
      currentType: 'DC',
      status: 'in_use',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    station: {
      stationCode: 'ST-1',
      name: 'Moda Rapid Hub',
      city: 'Istanbul',
      district: 'Kadikoy',
      latitude: '40.987',
      longitude: '29.026',
      status: 'open',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    receipt,
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

  it('maps active-session unique violations to a conflict', async () => {
    const insertReturning = jest.fn().mockRejectedValue({
      code: '23505',
      constraint: 'sessions_active_user_unique',
    });
    const insertValues = jest.fn().mockReturnValue({ returning: insertReturning });
    const tx = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectResult([{ id: 7, isActive: true }]))
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([{ id: 10 }])),
      update: jest.fn().mockReturnValue(updateResult([{ plugCode: 'PLUG-1', status: 'available' }])),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));

    const service = new SessionService({ listPlugs: jest.fn() } as never);

    await expect(service.startSession(7, 'PLUG-1', '34ABC123')).rejects.toMatchObject({
      status: 409,
      message: 'Active session already exists',
    });
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

  it('loads session context with one joined query when listing sessions', async () => {
    const listPlugs = jest.fn();
    const joinedQuery = joinedSelectResult([]);
    jest.mocked(db.select).mockReturnValue(joinedQuery as never);

    const service = new SessionService({ listPlugs } as never);

    await service.listSessions({ userId: 7, status: 'active' });

    expect(joinedQuery.where).toHaveBeenCalledTimes(1);
    expect(joinedQuery.orderBy).toHaveBeenCalledTimes(1);
    expect(joinedQuery.innerJoin).toHaveBeenCalledTimes(3);
    expect(joinedQuery.leftJoin).toHaveBeenCalledTimes(1);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(listPlugs).not.toHaveBeenCalled();
  });

  it('returns completed session history newest first with station and receipt context', async () => {
    const olderReceipt = {
      receiptNo: 'R-000001',
      sessionId: 1,
      subtotal: '150',
      taxAmount: '30',
      totalAmount: '180',
      currency: 'TRY',
      issuedAt: new Date('2026-06-04T12:10:00.000Z'),
      createdAt: new Date('2026-06-04T12:10:00.000Z'),
      updatedAt: new Date('2026-06-04T12:10:00.000Z'),
    };
    const newerReceipt = {
      ...olderReceipt,
      receiptNo: 'R-000002',
      sessionId: 2,
      totalAmount: '90',
    };
    const joinedQuery = joinedSelectResult([
      sessionContextRow(
        {
          id: 2,
          status: 'completed',
          startedAt: new Date('2026-06-04T13:00:00.000Z'),
          endedAt: new Date('2026-06-04T13:05:00.000Z'),
          energyKwh: '10',
          durationMinutes: '5',
          totalPrice: '90',
        },
        newerReceipt,
      ),
      sessionContextRow(
        {
          id: 1,
          status: 'completed',
          startedAt: new Date('2026-06-04T12:00:00.000Z'),
          endedAt: new Date('2026-06-04T12:10:00.000Z'),
          energyKwh: '20',
          durationMinutes: '10',
          totalPrice: '180',
        },
        olderReceipt,
      ),
    ]);
    jest.mocked(db.select).mockReturnValue(joinedQuery as never);
    const service = new SessionService({ listPlugs: jest.fn() } as never);

    const history = await service.listSessions({ userId: 7, status: 'completed' });

    expect(joinedQuery.orderBy).toHaveBeenCalledTimes(1);
    expect(history.map((session) => session.id)).toEqual([2, 1]);
    expect(history[0].plug.station.name).toBe('Moda Rapid Hub');
    expect(history[0].receipt).toEqual(newerReceipt);
  });

  it('adds a live projection for active sessions', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-04T12:10:00.000Z'));
    const joinedQuery = joinedSelectResult([sessionContextRow()]);
    jest.mocked(db.select).mockReturnValue(joinedQuery as never);
    const service = new SessionService({ listPlugs: jest.fn() } as never);

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
      endedAt: new Date('2026-06-04T12:10:00.000Z'),
      energyKwh: '20',
      durationMinutes: '10',
      totalPrice: '180',
      status: 'completed',
      updatedAt: new Date('2026-06-04T12:10:00.000Z'),
    };
    const joinedQuery = joinedSelectResult([sessionContextRow(completedSession)]);
    jest.mocked(db.select).mockReturnValue(joinedQuery as never);
    const service = new SessionService({ listPlugs: jest.fn() } as never);

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
    jest.mocked(db.select).mockReturnValue(joinedSelectResult([sessionContextRow(updatedSession)]) as never);
    const service = new SessionService({ listPlugs: jest.fn() } as never);

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
