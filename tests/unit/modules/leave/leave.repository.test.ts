import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-2: LeaveRequestRepository contract', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines create, findById, findByEmployeeId and update methods', () => {
    const repository: LeaveRequestRepository = {
      create: async (r: LeaveRequest) => r,
      findById: async () => null,
      findByEmployeeId: async () => [],
      update: async (r: LeaveRequest) => r
    };

    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByEmployeeId).toBe('function');
    expect(typeof repository.update).toBe('function');
  });

  it('returns expected promise shapes from the contract implementation', async () => {
    const request = {
      id: '1',
      employeeId: 'emp',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    } as LeaveRequest;

    const repository: LeaveRequestRepository = {
      create: async () => request,
      findById: async () => request,
      findByEmployeeId: async () => [request],
      update: async () => request
    };

    await expect(repository.findById('1')).resolves.toEqual(request);
    await expect(repository.findByEmployeeId('emp')).resolves.toHaveLength(1);
  });
});