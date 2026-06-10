import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-2 LeaveRepository contract and behavior', () => {
  let repository: LeaveRepository;

  beforeEach(() => {
    repository = new InMemoryLeaveRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports create, findById and findByEmployeeId using LeaveRequest entities', async () => {
    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'SICK',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-02'),
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: new Date('2025-02-01T00:00:00Z'),
    };

    const created = await repository.create(request);
    const byId = await repository.findById(request.id);
    const byEmployee = await repository.findByEmployeeId(request.employeeId);

    expect(created).toEqual(request);
    expect(byId).toEqual(request);
    expect(byEmployee).toEqual([request]);
  });

  it('returns null and empty arrays when entities do not exist', async () => {
    await expect(repository.findById('missing')).resolves.toBeNull();
    await expect(repository.findByEmployeeId('missing-employee')).resolves.toEqual([]);
  });
});