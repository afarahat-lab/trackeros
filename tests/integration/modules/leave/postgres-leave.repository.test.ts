import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../../src/shared/db/connection', () => ({
  default: { query: queryMock },
}));

describe('SC-3 and SC-5: PostgresLeaveRepository behavior', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and maps a leave request', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    const row = {
      id: '1',
      employee_id: 'emp-1',
      leave_type: 'VACATION',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-02'),
      status: 'PENDING',
      approver_employee_id: 'mgr-1',
      created_at: new Date('2024-01-01'),
    };

    queryMock.mockResolvedValue({ rows: [row] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as object);
    const result = await repo.create({
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'VACATION',
      startDate: row.start_date,
      endDate: row.end_date,
      status: 'PENDING',
      approverEmployeeId: 'mgr-1',
      createdAt: row.created_at,
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('1');
  });

  it('findById returns a record when found', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [{ id: 'abc', employee_id: 'emp-1' }] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as object);
    const result = await repo.findById('abc');

    expect(queryMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('findById returns null when not found', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as object);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findByEmployeeId returns a list', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValue({ rows: [{ id: '1' }, { id: '2' }] });

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as object);
    const result = await repo.findByEmployeeId('emp-1');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('wraps database errors with repository-specific error', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');

    queryMock.mockRejectedValue(new Error('db failure'));

    const repo = new PostgresLeaveRepository({ query: queryMock } as unknown as object);

    await expect(repo.create({
      id: '1',
      employeeId: 'e',
      leaveType: 'VACATION',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      approverEmployeeId: 'm',
      createdAt: new Date(),
    })).rejects.toThrow(/LEAVE_REPOSITORY_CREATE_FAILED/);
  });
});