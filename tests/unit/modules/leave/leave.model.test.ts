import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LeaveRequest, LeaveRequestStatus, LeaveType } from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports canonical leave types and shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts valid LeaveType and LeaveRequestStatus values', () => {
    const leaveType: LeaveType = 'ANNUAL';
    const status: LeaveRequestStatus = 'PENDING';

    expect(leaveType).toBe('ANNUAL');
    expect(status).toBe('PENDING');
  });

  it('matches the required LeaveRequest field contract', () => {
    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'SICK',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'APPROVED',
      approverEmployeeId: 'manager-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    expect(Object.keys(request).sort()).toEqual([
      'approverEmployeeId',
      'createdAt',
      'employeeId',
      'endDate',
      'id',
      'leaveType',
      'startDate',
      'status',
    ].sort());
  });
});