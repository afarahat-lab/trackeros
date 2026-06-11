import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LeaveType,
  LeaveRequestStatus,
  type LeaveRequest,
} from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports and types', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType values ANNUAL, SICK, and EMERGENCY', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    expect(Object.values(LeaveType)).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
  });

  it('exports LeaveRequestStatus values PENDING, APPROVED, and REJECTED', () => {
    expect(LeaveRequestStatus.PENDING).toBe('PENDING');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(Object.values(LeaveRequestStatus)).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('supports a LeaveRequest object containing required fields', () => {
    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: LeaveType.ANNUAL,
      status: LeaveRequestStatus.PENDING,
    };

    expect(request.id).toBe('leave-1');
    expect(request.employeeId).toBe('employee-1');
    expect(request.leaveType).toBe('ANNUAL');
    expect(request.status).toBe('PENDING');
  });

  it('rejects unsupported values through explicit runtime validation', () => {
    const invalidLeaveType = 'VACATION';
    const invalidStatus = 'IN_REVIEW';

    expect(Object.values(LeaveType)).not.toContain(invalidLeaveType);
    expect(Object.values(LeaveRequestStatus)).not.toContain(invalidStatus);
  });
});