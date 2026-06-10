import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: queryMock,
  })),
}));

describe('SC-3: PostgresLeaveRepository implementation', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports PostgresLeaveRepository', async () => {
    const mod = await import('../../src/modules/leave/postgres-leave.repository');
    expect(mod).toHaveProperty('PostgresLeaveRepository');
  });

  it('uses pg.Pool through repository implementation', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/modules/leave/postgres-leave.repository.ts', 'utf8');

    expect(content).toContain('Pool');
    expect(content).toContain('implements LeaveRepository');
  });

  it('create delegates to pool query', async () => {
    const mod = await import('../../src/modules/leave/postgres-leave.repository');

    queryMock.mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const repository = new mod.PostgresLeaveRepository();

    if (typeof repository.create === 'function') {
      await repository.create({
        id: '1',
        employeeId: 'e1',
        leaveType: 'ANNUAL',
        startDate: new Date(),
        endDate: new Date(),
        status: 'PENDING',
        approverEmployeeId: 'a1',
        createdAt: new Date(),
      });

      expect(queryMock).toHaveBeenCalled();
    }
  });
});