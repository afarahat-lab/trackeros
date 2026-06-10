import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-4/SC-5/SC-6: PostgreSqlLeaveRepository', () => {
  it('createLeaveRequest persists a PENDING request and creates CREATED audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const auditRepository: AuditRepository = {
      createAuditRecord: vi.fn().mockResolvedValue({
        id: 'audit-1',
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    };

    const repository = new PostgreSqlLeaveRepository({ query } as never, auditRepository);

    const result = await repository.createLeaveRequest({
      employeeId: 'employee-1',
      leaveType: 'ANNUAL'
    });

    expect(result.status).toBe('PENDING');
    expect(query).toHaveBeenCalledTimes(1);
    expect(auditRepository.createAuditRecord).toHaveBeenCalledTimes(1);
    expect(auditRepository.createAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'LeaveRequest',
        action: 'CREATED'
      })
    );
  });

  it('findById returns the persisted record', async () => {
    const repository = new PostgreSqlLeaveRepository(
      {
        query: vi.fn().mockResolvedValue({
          rows: [{
            id: 'leave-1',
            employee_id: 'employee-1',
            leave_type: 'SICK',
            status: 'PENDING'
          }]
        })
      } as never,
      { createAuditRecord: vi.fn() }
    );

    const result = await repository.findById('leave-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('leave-1');
    expect(result?.leaveType).toBe('SICK');
  });

  it('findById returns null when no record exists', async () => {
    const repository = new PostgreSqlLeaveRepository(
      { query: vi.fn().mockResolvedValue({ rows: [] }) } as never,
      { createAuditRecord: vi.fn() }
    );

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('updateStatus returns updated leave request', async () => {
    const repository = new PostgreSqlLeaveRepository(
      {
        query: vi.fn().mockResolvedValue({
          rows: [{
            id: 'leave-1',
            employee_id: 'employee-1',
            leave_type: 'EMERGENCY',
            status: 'APPROVED'
          }]
        })
      } as never,
      { createAuditRecord: vi.fn() }
    );

    const result = await repository.updateStatus('leave-1', 'APPROVED');

    expect(result.status).toBe('APPROVED');
    expect(result.leaveType).toBe('EMERGENCY');
  });

  it('createLeaveRequest wraps persistence errors', async () => {
    const repository = new PostgreSqlLeaveRepository(
      { query: vi.fn().mockRejectedValue(new Error('db failed')) } as never,
      { createAuditRecord: vi.fn() }
    );

    await expect(
      repository.createLeaveRequest({
        employeeId: 'employee-1',
        leaveType: 'ANNUAL'
      })
    ).rejects.toThrow(/LEAVE_REQUEST_CREATE_FAILED/);
  });
});