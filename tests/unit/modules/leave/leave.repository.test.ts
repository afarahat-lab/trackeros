import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-3/SC-4/SC-5: leave repository CRUD and audit behavior', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a leave request and writes an audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const auditCreate = vi.fn().mockResolvedValue({});

    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: auditCreate }
    );

    const created = await repository.create({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02')
    });

    expect(created.employeeId).toBe('emp-1');
    expect(created.status).toBe('PENDING');
    expect(query).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0]?.[0]).toMatchObject({
      entityType: 'LeaveRequest',
      action: 'CREATE'
    });
  });

  it('returns null when findById does not find a record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: vi.fn() }
    );

    const result = await repository.findById('missing');
    expect(result).toBeNull();
  });

  it('reads an existing leave request', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: '1',
        employee_id: 'e1',
        leave_type: 'ANNUAL',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02'),
        status: 'PENDING',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }]
    });

    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: vi.fn() }
    );

    const result = await repository.findById('1');

    expect(result?.id).toBe('1');
    expect(result?.employeeId).toBe('e1');
  });

  it('updates status and writes an audit record', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: '1',
        employee_id: 'e1',
        leave_type: 'ANNUAL',
        start_date: new Date(),
        end_date: new Date(),
        status: 'APPROVED',
        created_at: new Date(),
        updated_at: new Date()
      }]
    });

    const auditCreate = vi.fn().mockResolvedValue({});

    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: auditCreate }
    );

    const updated = await repository.updateStatus('1', 'APPROVED');

    expect(updated.status).toBe('APPROVED');
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('deletes a leave request and writes an audit record', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const auditCreate = vi.fn().mockResolvedValue({});

    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: auditCreate }
    );

    await expect(repository.delete('1')).resolves.toBeUndefined();
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('propagates create database errors', async () => {
    const query = vi.fn().mockRejectedValue(new Error('insert failed'));

    const repository = new PostgreSqlLeaveRequestRepository(
      { query } as never,
      { create: vi.fn() }
    );

    await expect(repository.create({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date()
    })).rejects.toThrow('insert failed');
  });
});