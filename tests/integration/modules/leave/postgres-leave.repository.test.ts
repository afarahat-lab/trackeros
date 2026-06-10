import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../../src/shared/db/connection', () => ({
  default: { query: queryMock }
}));

describe('SC-3: PostgresLeaveRepository implementation', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('exports PostgresLeaveRepository and repository error', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    expect(mod.PostgresLeaveRepository).toBeDefined();
    expect(mod.LeaveRepositoryError).toBeDefined();
  });

  it('uses a pg-style pool query API during create', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    const repo = new mod.PostgresLeaveRepository({ query: queryMock } as never);

    const leaveRequest = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'VACATION',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      status: 'PENDING',
      approverEmployeeId: 'mgr-1',
      createdAt: new Date('2024-01-01')
    };

    queryMock.mockResolvedValue({ rows: [leaveRequest] });

    await repo.create(leaveRequest);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0]?.[0])).toContain('INSERT INTO leave_requests');
  });

  it('wraps database failures in LeaveRepositoryError', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    const repo = new mod.PostgresLeaveRepository({ query: queryMock } as never);

    queryMock.mockRejectedValue(new Error('db failure'));

    await expect(repo.create({
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'VACATION',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      approverEmployeeId: 'mgr',
      createdAt: new Date()
    })).rejects.toMatchObject({ name: 'LeaveRepositoryError' });
  });
});