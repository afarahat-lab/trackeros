import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('crypto', () => ({
  randomUUID: (): string => 'leave-id-123'
}));

import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-4/SC-5/SC-6: leave repository behavior', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines required repository methods', () => {
    const repository = new PostgreSqlLeaveRepository(
      { query: vi.fn() } as never,
      { createAuditRecord: vi.fn() }
    );

    expect(typeof repository.createLeaveRequest).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
  });

  it('stores leave request as PENDING regardless of DTO input and creates CREATED audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const auditRepository = {
      createAuditRecord: vi.fn().mockResolvedValue({ id: 'audit-1' })
    };

    const repository = new PostgreSqlLeaveRepository({ query } as never, auditRepository);

    const result = await repository.createLeaveRequest({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL'
    });

    expect(result.status).toBe('PENDING');
    expect(query).toHaveBeenCalled();
    expect(auditRepository.createAuditRecord).toHaveBeenCalledWith({
      entityType: 'LeaveRequest',
      entityId: 'leave-id-123',
      action: 'CREATED'
    });
  });

  it('returns persisted leave request from findById', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'leave-id-123',
          employee_id: 'emp-1',
          leave_type: 'ANNUAL',
          status: 'PENDING'
        }
      ]
    });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() }
    );

    const result = await repository.findById('leave-id-123');

    expect(result).toEqual({
      id: 'leave-id-123',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      status: 'PENDING'
    });
  });

  it('wraps create errors with repository error code', async () => {
    const repository = new PostgreSqlLeaveRepository(
      { query: vi.fn().mockRejectedValue(new Error('db_down')) } as never,
      { createAuditRecord: vi.fn() }
    );

    await expect(
      repository.createLeaveRequest({ employeeId: 'emp-1', leaveType: 'ANNUAL' })
    ).rejects.toThrow(/LEAVE_REQUEST_CREATE_FAILED/);
  });

  it('returns null when leave request is not found', async () => {
    const repository = new PostgreSqlLeaveRepository(
      { query: vi.fn().mockResolvedValue({ rows: [] }) } as never,
      { createAuditRecord: vi.fn() }
    );

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});