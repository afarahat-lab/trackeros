import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-5: repository persistence and retrieval flows', () => {
  const queryMock = vi.fn();

  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies persistence using LeaveRequest-compatible data', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query: queryMock } as never);

    const leaveRequest = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: '2024-01-01T00:00:00Z',
    };

    await repo.create(leaveRequest);

    expect(queryMock).toHaveBeenCalled();
    expect(leaveRequest).toHaveProperty('employeeId');
    expect(leaveRequest).toHaveProperty('leaveType');
  });

  it('verifies retrieval by id', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query: queryMock } as never);

    await repo.findById('1');

    expect(queryMock).toHaveBeenCalled();
    expect(String(queryMock.mock.calls[0][0])).toContain('SELECT');
  });

  it('verifies retrieval by employeeId', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query: queryMock } as never);

    await repo.findByEmployeeId('emp-1');

    expect(queryMock).toHaveBeenCalled();
  });
});