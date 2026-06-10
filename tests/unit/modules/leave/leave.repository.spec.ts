import { describe, expect, it } from 'vitest';
import { InMemoryLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('InMemoryLeaveRepository', () => {
  const leaveRequest: LeaveRequest = {
    id: 'leave-1',
    employeeId: 'employee-1',
    leaveType: 'ANNUAL',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-02'),
    status: 'PENDING',
    approverEmployeeId: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  it('persists and retrieves by id', async () => {
    const repository = new InMemoryLeaveRepository();

    await repository.create(leaveRequest);

    await expect(repository.findById('leave-1')).resolves.toEqual(leaveRequest);
  });

  it('lists requests by employee id', async () => {
    const repository = new InMemoryLeaveRepository();

    await repository.create(leaveRequest);

    const results = await repository.findByEmployeeId('employee-1');

    expect(results).toEqual([leaveRequest]);
  });
});