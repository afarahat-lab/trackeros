import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-2: LeaveRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines create, findById and findByEmployeeId methods operating on LeaveRequest', async () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: new Date(),
    };

    const repository: LeaveRepository = {
      create: async (value) => value,
      findById: async (id) => (id === leaveRequest.id ? leaveRequest : null),
      findByEmployeeId: async (employeeId) => employeeId === 'emp' ? [leaveRequest] : [],
    };

    await expect(repository.create(leaveRequest)).resolves.toEqual(leaveRequest);
    await expect(repository.findById('1')).resolves.toEqual(leaveRequest);
    await expect(repository.findByEmployeeId('emp')).resolves.toEqual([leaveRequest]);
  });

  it('supports null and empty result error cases from contract methods', async () => {
    const repository: LeaveRepository = {
      create: async (value) => value,
      findById: async () => null,
      findByEmployeeId: async () => [],
    };

    await expect(repository.findById('missing')).resolves.toBeNull();
    await expect(repository.findByEmployeeId('missing')).resolves.toEqual([]);
  });
});