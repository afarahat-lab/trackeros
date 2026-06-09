import * as db from '../../src/shared/db';
import { BalanceRepository } from '../../src/modules/balance/balance.repository';
import { LeaveType } from '../../src/modules/balance/balance.model';

jest.mock('../../src/shared/db', () => ({
  query: jest.fn(),
}));

const mockedDb = db as unknown as {
  query: jest.Mock;
};

describe('BalanceRepository', () => {
  const repository = new BalanceRepository();

  beforeEach(() => {
    mockedDb.query.mockReset();
  });

  it('looks up a leave balance by employee and leave type', async () => {
    mockedDb.query.mockResolvedValue({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          entitlement: 20,
          pending: 2,
          used: 5,
          period_start: new Date('2026-01-01T00:00:00.000Z'),
          period_end: new Date('2026-12-31T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.getByEmployeeAndType('employee-1', LeaveType.Annual);

    expect(mockedDb.query).toHaveBeenCalledWith(expect.any(String), ['employee-1', LeaveType.Annual]);
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      entitlement: 20,
      pending: 2,
      used: 5,
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-12-31T00:00:00.000Z'),
    });
  });

  it('returns null when a leave balance lookup has no result', async () => {
    mockedDb.query.mockResolvedValue({
      rows: [],
    });

    const balance = await repository.getByEmployeeAndType('employee-1', LeaveType.Sick);

    expect(balance).toBeNull();
  });

  it('upserts a leave balance', async () => {
    mockedDb.query.mockResolvedValue({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Sick,
          entitlement: '10',
          pending: '0',
          used: '1',
          period_start: '2026-01-01T00:00:00.000Z',
          period_end: '2026-12-31T00:00:00.000Z',
        },
      ],
    });

    const balance = await repository.upsertBalance({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      entitlement: 10,
      used: 1,
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-12-31T00:00:00.000Z'),
    });

    expect(mockedDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO leave_balances'),
      [
        'employee-1',
        LeaveType.Sick,
        10,
        0,
        1,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-12-31T00:00:00.000Z'),
      ],
    );
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      entitlement: 10,
      pending: 0,
      used: 1,
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-12-31T00:00:00.000Z'),
    });
  });

  it('adjusts pending leave balance', async () => {
    mockedDb.query.mockResolvedValue({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          entitlement: 20,
          pending: 5,
          used: 4,
          period_start: new Date('2026-01-01T00:00:00.000Z'),
          period_end: new Date('2026-12-31T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.adjustPending({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      amount: 3,
    });

    expect(mockedDb.query).toHaveBeenCalledWith(expect.stringContaining('SET pending = pending + $3'), [
      'employee-1',
      LeaveType.Annual,
      3,
    ]);
    expect(balance.pending).toBe(5);
  });

  it('adjusts used leave balance', async () => {
    mockedDb.query.mockResolvedValue({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Emergency,
          entitlement: 5,
          pending: 0,
          used: 2,
          period_start: new Date('2026-01-01T00:00:00.000Z'),
          period_end: new Date('2026-12-31T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.adjustUsed({
      employeeId: 'employee-1',
      leaveType: LeaveType.Emergency,
      amount: 1,
    });

    expect(mockedDb.query).toHaveBeenCalledWith(expect.stringContaining('SET used = used + $3'), [
      'employee-1',
      LeaveType.Emergency,
      1,
    ]);
    expect(balance.used).toBe(2);
  });
});
