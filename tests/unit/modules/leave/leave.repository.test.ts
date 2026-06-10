import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('crypto', () => ({
  randomUUID: () => 'leave-id-123'
}));

import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

type QueryResult = { rows: Array<{ id: string; employee_id: string; leave_type: string; status: string }> };

describe('SC-4/SC-5/SC-6: PostgreSqlLeaveRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createLeaveRequest stores a PENDING leave request and writes a CREATED audit record', async () => {
    const query = vi.fn<(...args: unknown[]) => Promise<QueryResult>>().mockResolvedValue({ rows: [] });
    const auditRepository = {
      createAuditRecord: vi.fn().mockResolvedValue({ id: 'audit-1' })
    };

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      auditRepository
    );

    const result = await repository.createLeaveRequest({
      employeeId: 'emp-1',
      leaveType: 'VACATION',
      status: 'APPROVED'
    } as never);

    expect(result.id).toBe('leave-id-123');
    expect(result.status).toBe('PENDING');
    expect(query).toHaveBeenCalledTimes(1);
    expect(auditRepository.createAuditRecord).toHaveBeenCalledWith({
      entityType: 'LeaveRequest',
      entityId: 'leave-id-123',
      action: 'CREATED'
    });
  });

  it('findById returns a persisted leave request', async () => {
    const query = vi
      .fn<(...args: unknown[]) => Promise<QueryResult>>()
      .mockResolvedValue({
        rows: [
          {
            id: 'leave-id-123',
            employee_id: 'emp-1',
            leave_type: 'VACATION',
            status: 'PENDING'
          }
        ]
      });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() }
    );

    const result = await repository.findById('leave-id-123');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('leave-id-123');
    expect(result?.status).toBe('PENDING');
  });

  it('wraps leave creation database errors', async () => {
    const query = vi.fn<(...args: unknown[]) => Promise<QueryResult>>().mockRejectedValue(new Error('db-error'));

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() }
    );

    await expect(
      repository.createLeaveRequest({ employeeId: 'emp-1', leaveType: 'VACATION' } as never)
    ).rejects.toThrow('LEAVE_REQUEST_CREATE_FAILED:db-error');
  });

  it('wraps audit creation errors', async () => {
    const query = vi.fn<(...args: unknown[]) => Promise<QueryResult>>().mockResolvedValue({ rows: [] });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn().mockRejectedValue(new Error('audit-error')) }
    );

    await expect(
      repository.createLeaveRequest({ employeeId: 'emp-1', leaveType: 'VACATION' } as never)
    ).rejects.toThrow('LEAVE_AUDIT_CREATE_FAILED:audit-error');
  });
});