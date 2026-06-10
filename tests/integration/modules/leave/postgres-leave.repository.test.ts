import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('pg', () => ({
  Pool: class {},
}));

vi.mock('../../../../src/shared/db/connection', () => ({
  default: { query: queryMock },
}));

describe('SC-3: PostgresLeaveRepository integration behavior', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists a leave request through Pool.query', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({
      rows: [{
        id: '1',
        employee_id: 'emp',
        leave_type: 'ANNUAL',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        status: 'PENDING',
        approver_employee_id: null,
        created_at: '2024-01-01T00:00:00Z',
      }],
    });

    const repo = new PostgresLeaveRepository({ query: queryMock } as never);

    await repo.create({
      id: '1',
      employeeId: 'emp',
      leaveType: 'ANNUAL',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: '2024-01-01T00:00:00Z',
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).toContain('INSERT INTO leave_requests');
  });

  it('returns null when findById has no matching row', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as never);
    const result = await repo.findById('missing');

    expect(result).toBeNull();
  });
});