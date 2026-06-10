import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

vi.mock('crypto', () => ({ randomUUID: () => 'uuid-1' }));

describe('SC-5 and SC-6 leave repository behavior', () => {
  beforeEach(() => {});
  afterEach(() => { vi.clearAllMocks(); });

  it('creates a leave request and writes an audit record', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) };
    const auditRepository = { create: vi.fn().mockResolvedValue({}) };

    const repository = new PostgreSqlLeaveRequestRepository(pool as never, auditRepository);

    const result = await repository.create({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL' as never,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02')
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(auditRepository.create).toHaveBeenCalledTimes(1);
    expect(result.employeeId).toBe('emp-1');
    expect(result.status).toBe('PENDING');
  });

  it('surfaces create failures with repository error code', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('insert_failed')) };
    const auditRepository = { create: vi.fn() };

    const repository = new PostgreSqlLeaveRequestRepository(pool as never, auditRepository);

    await expect(repository.create({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL' as never,
      startDate: new Date(),
      endDate: new Date()
    })).rejects.toThrow('LEAVE_REQUEST_CREATE_FAILED:insert_failed');
  });

  it('exposes create, findById, updateStatus, and delete methods', () => {
    const repository = new PostgreSqlLeaveRequestRepository({ query: vi.fn() } as never, { create: vi.fn() });

    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
    expect(typeof repository.delete).toBe('function');
  });
});