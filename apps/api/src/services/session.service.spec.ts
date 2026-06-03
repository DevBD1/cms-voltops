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
});
