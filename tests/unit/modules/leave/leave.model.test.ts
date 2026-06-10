import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CreateLeaveRequestDto, LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports all LeaveType values and LeaveRequestStatus values defined by the architecture', () => {
    const annual: CreateLeaveRequestDto = { employeeId: 'emp-1', leaveType: 'ANNUAL' };
    const sick: CreateLeaveRequestDto = { employeeId: 'emp-2', leaveType: 'SICK' };
    const emergency: CreateLeaveRequestDto = { employeeId: 'emp-3', leaveType: 'EMERGENCY' };

    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: annual.employeeId,
      leaveType: annual.leaveType,
      status: 'PENDING'
    };

    expect(annual.leaveType).toBe('ANNUAL');
    expect(sick.leaveType).toBe('SICK');
    expect(emergency.leaveType).toBe('EMERGENCY');
    expect(request.status).toBe('PENDING');

    request.status = 'APPROVED';
    expect(request.status).toBe('APPROVED');

    request.status = 'REJECTED';
    expect(request.status).toBe('REJECTED');
  });
});
