import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-3: PostgresLeaveRepository implements repository operations using pg Pool', () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('persists a leave request through pool.query', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    query.mockResolvedValue({ rows: [] });

    const repo = new PostgresLeaveRepository({ query } as unknown as { query: typeof query });

    await repo.create({
      id: '1', employeeId: 'emp', leaveType: 'ANNUAL', startDate: new Date(), endDate: new Date(),
      status: 'PENDING', approverEmployeeId: null, createdAt: new Date(),
    });

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('retrieves by id using pool.query', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    query.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query } as unknown as { query: typeof query });

    await repo.findById('1');

    expect(query).toHaveBeenCalled();
  });

  it('retrieves by employee id using pool.query', async () => {
    const { PostgresLeaveRepository } = await import('../../../../src/modules/leave/postgres-leave.repository');
    query.mockResolvedValue({ rows: [] });
    const repo = new PostgresLeaveRepository({ query } as unknown as { query: typeof query });

    await repo.findByEmployeeId('emp');

    expect(query).toHaveBeenCalled();
  });
});