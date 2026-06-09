import * as db from '../../src/shared/db';
import { LeaveType } from '../../src/modules/balance/balance.model';
import { BalanceRepository } from '../../src/modules/balance/balance.repository';

jest.mock('../../src/shared/db', () => ({
  query: jest.fn(),
}));

const mockedDb = db as unknown as {
  query: jest.Mock;
};

describe('BalanceRepository', () => {
  let repository: BalanceRepository;

  beforeEach(() => {
    repository = new BalanceRepository();
    mockedDb.query.mockReset();
  });

  it('looks up a leave balance by employee, leave type, and year', async () => {
    mockedDb.query.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          total_days: 20,
          used_days: 5,
          pending_days: 2,
          year: 2026,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.getByEmployeeAndType(
      'employee-1',
      LeaveType.Annual,
      2026
    );

    expect(mockedDb.query).toHaveBeenCalledWith(expect.any(String), [
      'employee-1',
      LeaveType.Annual,
      2026,
    ]);
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      totalDays: 20,
      usedDays: 5,
      pendingDays: 2,
      year: 2026,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('returns null when a leave balance lookup has no matching row', async () => {
    mockedDb.query.mockResolvedValueOnce({
      rows: [],
    });

    const balance = await repository.getByEmployeeAndType(
      'employee-1',
      LeaveType.Sick,
      2026
    );

    expect(balance).toBeNull();
  });

  it('upserts a leave balance', async () => {
    mockedDb.query.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Sick,
          total_days: 10,
          used_days: 1,
          pending_days: 0,
          year: 2026,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.upsertBalance({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      totalDays: 10,
      usedDays: 1,
      pendingDays: 0,
      year: 2026,
    });

    expect(mockedDb.query).toHaveBeenCalledWith(expect.any(String), [
      'employee-1',
      LeaveType.Sick,
      10,
      1,
      0,
      2026,
    ]);
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      totalDays: 10,
      usedDays: 1,
      pendingDays: 0,
      year: 2026,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('adjusts pending leave balance days', async () => {
    mockedDb.query.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          total_days: 20,
          used_days: 3,
          pending_days: 4,
          year: 2026,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-03T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.adjustPending({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      days: 2,
      year: 2026,
    });

    expect(mockedDb.query).toHaveBeenCalledWith(expect.any(String), [
      'employee-1',
      LeaveType.Annual,
      2026,
      2,
    ]);
    expect(balance.pendingDays).toBe(4);
  });

  it('adjusts used leave balance days', async () => {
    mockedDb.query.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Emergency,
          total_days: 5,
          used_days: 2,
          pending_days: 0,
          year: 2026,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-04T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.adjustUsed({
      employeeId: 'employee-1',
      leaveType: LeaveType.Emergency,
      days: 1,
      year: 2026,
    });

    expect(mockedDb.query).toHaveBeenCalledWith(expect.any(String), [
      'employee-1',
      LeaveType.Emergency,
      2026,
      1,
    ]);
    expect(balance.usedDays).toBe(2);
  });
});
