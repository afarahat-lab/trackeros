import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-3/SC-4/SC-6: PostgreSqlLeaveRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createLeaveRequest persists a PENDING leave request and creates a CREATED audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query };

    const auditRepository: AuditRepository = {
      createAuditRecord: vi.fn().mockResolvedValue({
        id: 'audit-1',
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    };

    const repository = new PostgreSqlLeaveRepository(pool as never, auditRepository);

    const result = await repository.createLeaveRequest({
      employeeId: 'employee-1',
      leaveType: 'ANNUAL'
    });

    expect(result.employeeId).toBe('employee-1');
    expect(result.leaveType).toBe('ANNUAL');
    expect(result.status).toBe('PENDING');
    expect(query).toHaveBeenCalledTimes(1);
    expect(auditRepository.createAuditRecord).toHaveBeenCalledWith({
      entityType: 'LeaveRequest',
      entityId: result.id,
      action: 'CREATED'
    });
  });

  it('findById returns a persisted record when found', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: 'leave-1',
        employee_id: 'employee-1',
        leave_type: 'SICK',
        status: 'APPROVED'
      }]
    });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() as AuditRepository['createAuditRecord'] }
    );

    const result = await repository.findById('leave-1');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'SICK',
      status: 'APPROVED'
    });
  });

  it('findById returns null when no record exists', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() as AuditRepository['createAuditRecord'] }
    );

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('updateStatus updates and returns the leave request', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: 'leave-1',
        employee_id: 'employee-1',
        leave_type: 'EMERGENCY',
        status: 'REJECTED'
      }]
    });

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() as AuditRepository['createAuditRecord'] }
    );

    const result = await repository.updateStatus('leave-1', 'REJECTED');

    expect(query).toHaveBeenCalled();
    expect(result.status).toBe('REJECTED');
  });

  it('wraps persistence errors during createLeaveRequest', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db failure'));

    const repository = new PostgreSqlLeaveRepository(
      { query } as never,
      { createAuditRecord: vi.fn() as AuditRepository['createAuditRecord'] }
    );

    await expect(
      repository.createLeaveRequest({ employeeId: 'employee-1', leaveType: 'ANNUAL' })
    ).rejects.toThrow(/LEAVE_REQUEST_CREATE_FAILED/);
  });
});