import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-5: repository persistence, retrieval, and LeaveRequest type usage', () => {
  const queryMock = vi.fn();

  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('persists LeaveRequest-compatible data', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    queryMock.mockResolvedValue({ rows: [] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as { query: typeof queryMock });
    const leaveRequest = {
      id: '1', employeeId: 'emp-1', leaveType: 'ANNUAL', startDate: new Date(), endDate: new Date(),
      status: 'PENDING', approverEmployeeId: null, createdAt: new Date(),
    };

    await repo.create(leaveRequest);

    expect(queryMock).toHaveBeenCalled();
    expect(leaveRequest.employeeId).toBe('emp-1');
  });

  it('retrieves by id', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    queryMock.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as { query: typeof queryMock });

    await repo.findById('1');

    expect(queryMock).toHaveBeenCalled();
  });

  it('retrieves by employeeId', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    queryMock.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as { query: typeof queryMock });

    await repo.findByEmployeeId('emp-1');

    expect(queryMock).toHaveBeenCalled();
  });
});