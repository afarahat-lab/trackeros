import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlLeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-3/SC-4/SC-6: PostgreSqlLeaveRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes repository methods', () => {
    const pool = { query: vi.fn() } as unknown as import('pg').Pool;
    const auditRepository = { createAuditRecord: vi.fn() };
    const repository = new PostgreSqlLeaveRepository(pool, auditRepository);

    expect(typeof repository.createLeaveRequest).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
  });

  it('creates a PENDING leave request and writes a CREATED audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as import('pg').Pool;
    const auditRepository = {
      createAuditRecord: vi.fn().mockResolvedValue({ id: 'audit-1' })
    };

    const repository = new PostgreSqlLeaveRepository(pool, auditRepository);

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

  it('propagates audit repository failures', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as import('pg').Pool;
    const auditRepository = {
      createAuditRecord: vi.fn().mockRejectedValue(new Error('audit failed'))
    };

    const repository = new PostgreSqlLeaveRepository(pool, auditRepository);

    await expect(
      repository.createLeaveRequest({ employeeId: 'employee-1', leaveType: 'SICK' })
    ).rejects.toThrow('audit failed');
  });

  it('findById returns the persisted leave request mapping database fields', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'leave-1',
            employee_id: 'employee-1',
            leave_type: 'EMERGENCY',
            status: 'PENDING'
          }
        ]
      })
    } as unknown as import('pg').Pool;

    const repository = new PostgreSqlLeaveRepository(pool, {
      createAuditRecord: vi.fn()
    });

    const result = await repository.findById('leave-1');

    expect(result).toEqual({
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'EMERGENCY',
      status: 'PENDING'
    });
  });

  it('findById returns null when no record exists', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    } as unknown as import('pg').Pool;

    const repository = new PostgreSqlLeaveRepository(pool, {
      createAuditRecord: vi.fn()
    });

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
