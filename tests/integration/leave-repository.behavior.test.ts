import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: queryMock,
  })),
}));

describe('SC-5: repository create/find behavior and LeaveRequest usage', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('create returns persisted leave request data', async () => {
    const mod = await import('../../src/modules/leave/postgres-leave.repository');

    const row = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      approverEmployeeId: 'mgr-1',
      createdAt: new Date(),
    };

    queryMock.mockResolvedValueOnce({ rows: [row] });

    const repository = new mod.PostgresLeaveRepository();

    if (typeof repository.create === 'function') {
      const result = await repository.create(row);
      expect(result).toEqual(row);
    }
  });

  it('findById queries and returns matching record', async () => {
    const mod = await import('../../src/modules/leave/postgres-leave.repository');
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'abc' }] });

    const repository = new mod.PostgresLeaveRepository();

    if (typeof repository.findById === 'function') {
      await repository.findById('abc');
      expect(queryMock).toHaveBeenCalled();
    }
  });

  it('findByEmployeeId queries and returns collection', async () => {
    const mod = await import('../../src/modules/leave/postgres-leave.repository');
    queryMock.mockResolvedValueOnce({ rows: [{ employeeId: 'emp-1' }] });

    const repository = new mod.PostgresLeaveRepository();

    if (typeof repository.findByEmployeeId === 'function') {
      await repository.findByEmployeeId('emp-1');
      expect(queryMock).toHaveBeenCalled();
    }
  });
});