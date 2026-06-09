import * as database from '../../src/shared/db';
import { BalanceRepository } from '../../src/modules/balance/balance.repository';
import { LeaveType } from '../../src/modules/balance/balance.model';

jest.mock('../../src/shared/db', () => ({
  query: jest.fn(),
}));

describe('BalanceRepository', () => {
  const queryMock = (database as unknown as { query: jest.Mock }).query;
  const repository = new BalanceRepository();

  beforeEach(() => {
    queryMock.mockReset();
  });

  it('looks up a balance by employee and leave type', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          entitlement: 20,
          pending: 2,
          used: 5,
          period_start: new Date('2024-01-01T00:00:00.000Z'),
          period_end: new Date('2024-12-31T00:00:00.000Z'),
        },
      ],
    });

    const balance = await repository.getByEmployeeAndType('employee-1', LeaveType.Annual);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][1]).toEqual(['employee-1', LeaveType.Annual]);
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      entitlement: 20,
      pending: 2,
      used: 5,
      periodStart: new Date('2024-01-01T00:00:00.000Z'),
      periodEnd: new Date('2024-12-31T00:00:00.000Z'),
    });
  });

  it('returns null when no balance exists for an employee and leave type', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const balance = await repository.getByEmployeeAndType('employee-1', LeaveType.Sick);

    expect(balance).toBeNull();
  });

  it('upserts a balance', async () => {
    const periodStart = new Date('2024-01-01T00:00:00.000Z');
    const periodEnd = new Date('2024-12-31T00:00:00.000Z');

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Sick,
          entitlement: '10',
          pending: '0',
          used: '1',
          period_start: periodStart,
          period_end: periodEnd,
        },
      ],
    });

    const balance = await repository.upsertBalance({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      entitlement: 10,
      used: 1,
      periodStart,
      periodEnd,
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][1]).toEqual([
      'employee-1',
      LeaveType.Sick,
      10,
      0,
      1,
      periodStart,
      periodEnd,
    ]);
    expect(balance).toEqual({
      employeeId: 'employee-1',
      leaveType: LeaveType.Sick,
      entitlement: 10,
      pending: 0,
      used: 1,
      periodStart,
      periodEnd,
    });
  });

  it('adjusts pending leave days', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Annual,
          entitlement: 20,
          pending: 4,
          used: 3,
          period_start: '2024-01-01T00:00:00.000Z',
          period_end: '2024-12-31T00:00:00.000Z',
        },
      ],
    });

    const balance = await repository.adjustPending({
      employeeId: 'employee-1',
      leaveType: LeaveType.Annual,
      days: 2,
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][1]).toEqual(['employee-1', LeaveType.Annual, 2]);
    expect(balance.pending).toBe(4);
    expect(balance.used).toBe(3);
  });

  it('adjusts used leave days', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'employee-1',
          leave_type: LeaveType.Emergency,
          entitlement: 5,
          pending: 1,
          used: 2,
          period_start: '2024-01-01T00:00:00.000Z',
          period_end: '2024-12-31T00:00:00.000Z',
        },
      ],
    });

    const balance = await repository.adjustUsed({
      employeeId: 'employee-1',
      leaveType: LeaveType.Emergency,
      days: 1,
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][1]).toEqual(['employee-1', LeaveType.Emergency, 1]);
    expect(balance.pending).toBe(1);
    expect(balance.used).toBe(2);
  });
});
