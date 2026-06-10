import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryLeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-2: LeaveRepository contract and repository behavior', () => {
  let repository: InMemoryLeaveRepository;

  beforeEach(() => {
    repository = new InMemoryLeaveRepository();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('creates and retrieves a leave request by id', async () => {
    const leave = {
      id: '1', employeeId: 'emp-1', leaveType: 'ANNUAL' as const,
      startDate: new Date(), endDate: new Date(), status: 'PENDING' as const,
      approverEmployeeId: null, createdAt: new Date(),
    };

    await repository.create(leave);
    const found = await repository.findById('1');

    expect(found).toEqual(leave);
  });

  it('returns null for unknown ids', async () => {
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('retrieves requests by employee id', async () => {
    const leave = {
      id: '2', employeeId: 'emp-2', leaveType: 'SICK' as const,
      startDate: new Date(), endDate: new Date(), status: 'APPROVED' as const,
      approverEmployeeId: 'mgr-1', createdAt: new Date(),
    };

    await repository.create(leave);
    const found = await repository.findByEmployeeId('emp-2');

    expect(found).toHaveLength(1);
    expect(found[0]?.employeeId).toBe('emp-2');
  });
});