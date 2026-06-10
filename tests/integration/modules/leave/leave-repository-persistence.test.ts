import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../../src/shared/db/connection', () => ({
  default: { query: queryMock }
}));

describe('SC-5: repository persistence behavior', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('creates and retrieves a LeaveRequest by id', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    const repo = new mod.PostgresLeaveRepository({ query: queryMock } as never);

    const record = {
      id: 'leave-1',
      employeeId: 'emp-1',
      leaveType: 'VACATION',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-05'),
      status: 'PENDING',
      approverEmployeeId: 'mgr-1',
      createdAt: new Date('2024-01-01')
    };

    queryMock
      .mockResolvedValueOnce({ rows: [record] })
      .mockResolvedValueOnce({ rows: [record] });

    const created = await repo.create(record);
    const found = await repo.findById('leave-1');

    expect(created.id).toBe('leave-1');
    expect(found).not.toBeNull();
    expect(found?.employeeId).toBe('emp-1');
  });

  it('lists requests by employeeId', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    const repo = new mod.PostgresLeaveRepository({ query: queryMock } as never);

    queryMock.mockResolvedValue({
      rows: [{
        id: 'leave-2',
        employeeId: 'emp-99',
        leaveType: 'SICK',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-02'),
        status: 'APPROVED',
        approverEmployeeId: 'mgr-1',
        createdAt: new Date('2024-02-01')
      }]
    });

    const results = await repo.findByEmployeeId('emp-99');

    expect(Array.isArray(results)).toBe(true);
    expect(results[0]?.employeeId).toBe('emp-99');
  });

  it('returns null or throws appropriately on lookup failures', async () => {
    const mod = await import('../../../../src/modules/leave/postgres-leave.repository');
    const repo = new mod.PostgresLeaveRepository({ query: queryMock } as never);

    queryMock.mockResolvedValue({ rows: [] });

    const result = await repo.findById('missing');
    expect(result === null || result === undefined).toBe(true);
  });
});