import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LeaveRepository } from '../../../../src/modules/leave/leave.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-2 LeaveRepository contract', () => {
  it('supports create, findById and findByEmployeeId methods operating on LeaveRequest', async () => {
    const leave: LeaveRequest = {
      id: '1',
      employeeId: 'e1',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: new Date(),
    };

    const repository: LeaveRepository = {
      create: vi.fn().mockResolvedValue(leave),
      findById: vi.fn().mockResolvedValue(leave),
      findByEmployeeId: vi.fn().mockResolvedValue([leave]),
    };

    await expect(repository.create(leave)).resolves.toEqual(leave);
    await expect(repository.findById('1')).resolves.toEqual(leave);
    await expect(repository.findByEmployeeId('e1')).resolves.toEqual([leave]);
  });

  it('supports null result from findById for missing records', async () => {
    const repository: LeaveRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByEmployeeId: vi.fn().mockResolvedValue([]),
    };

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});