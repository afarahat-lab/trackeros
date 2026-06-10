import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgresLeaveRepository } from '../../../../src/modules/leave/postgres-leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-3 and SC-5 PostgresLeaveRepository integration behavior', () => {
  const leave: LeaveRequest = {
    id: 'leave-1',
    employeeId: 'employee-1',
    leaveType: 'ANNUAL',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-05'),
    status: 'PENDING',
    approverEmployeeId: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  it('persists a LeaveRequest via pg Pool query and maps result', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: leave.id,
        employee_id: leave.employeeId,
        leave_type: leave.leaveType,
        start_date: leave.startDate,
        end_date: leave.endDate,
        status: leave.status,
        approver_employee_id: leave.approverEmployeeId,
        created_at: leave.createdAt,
      }],
    });

    const repository = new PostgresLeaveRepository({ query } as never);
    const result = await repository.create(leave);

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.employeeId).toBe('employee-1');
    expect(result.leaveType).toBe('ANNUAL');
  });

  it('retrieves a leave request by id', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: leave.id,
        employee_id: leave.employeeId,
        leave_type: leave.leaveType,
        start_date: leave.startDate,
        end_date: leave.endDate,
        status: leave.status,
        approver_employee_id: leave.approverEmployeeId,
        created_at: leave.createdAt,
      }],
    });

    const repository = new PostgresLeaveRepository({ query } as never);
    const result = await repository.findById(leave.id);

    expect(result?.id).toBe(leave.id);
  });

  it('returns null when id is not found', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('lists requests by employeeId', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: leave.id,
        employee_id: leave.employeeId,
        leave_type: leave.leaveType,
        start_date: leave.startDate,
        end_date: leave.endDate,
        status: leave.status,
        approver_employee_id: leave.approverEmployeeId,
        created_at: leave.createdAt,
      }],
    });

    const repository = new PostgresLeaveRepository({ query } as never);
    const results = await repository.findByEmployeeId('employee-1');

    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe('employee-1');
  });

  it('propagates database errors', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db failure'));
    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.findByEmployeeId('employee-1')).rejects.toThrow('db failure');
  });
});