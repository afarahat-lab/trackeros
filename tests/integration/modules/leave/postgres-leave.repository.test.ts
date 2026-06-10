import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgresLeaveRepository } from '../../../../src/modules/leave/postgres-leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-3 and SC-5: PostgresLeaveRepository persistence behaviour', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const leaveRequest: LeaveRequest = {
    id: 'leave-1',
    employeeId: 'employee-1',
    leaveType: 'ANNUAL',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-05'),
    status: 'PENDING',
    approverEmployeeId: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  it('persists and maps LeaveRequest records correctly', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: leaveRequest.id,
        employee_id: leaveRequest.employeeId,
        leave_type: leaveRequest.leaveType,
        start_date: leaveRequest.startDate,
        end_date: leaveRequest.endDate,
        status: leaveRequest.status,
        approver_employee_id: leaveRequest.approverEmployeeId,
        created_at: leaveRequest.createdAt,
      }],
    });

    const repository = new PostgresLeaveRepository({ query } as never);
    const result = await repository.create(leaveRequest);

    expect(query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(leaveRequest);
  });

  it('retrieves by id and lists by employeeId', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{
        id: leaveRequest.id,
        employee_id: leaveRequest.employeeId,
        leave_type: leaveRequest.leaveType,
        start_date: leaveRequest.startDate,
        end_date: leaveRequest.endDate,
        status: leaveRequest.status,
        approver_employee_id: leaveRequest.approverEmployeeId,
        created_at: leaveRequest.createdAt,
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: leaveRequest.id,
        employee_id: leaveRequest.employeeId,
        leave_type: leaveRequest.leaveType,
        start_date: leaveRequest.startDate,
        end_date: leaveRequest.endDate,
        status: leaveRequest.status,
        approver_employee_id: leaveRequest.approverEmployeeId,
        created_at: leaveRequest.createdAt,
      }] });

    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.findById('leave-1')).resolves.toEqual(leaveRequest);
    await expect(repository.findByEmployeeId('employee-1')).resolves.toEqual([leaveRequest]);
  });

  it('wraps database errors with repository-specific errors', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db failure'));
    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.create(leaveRequest)).rejects.toThrow(/LEAVE_REPOSITORY_CREATE_FAILED/);
  });
});