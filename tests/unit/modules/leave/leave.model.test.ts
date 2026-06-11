import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeaveType, LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType values ANNUAL, SICK, and EMERGENCY', () => {
    expect(LeaveType.ANNUAL).toBeDefined();
    expect(LeaveType.SICK).toBeDefined();
    expect(LeaveType.EMERGENCY).toBeDefined();
  });

  it('exports LeaveRequestStatus values PENDING, APPROVED, and REJECTED', () => {
    expect(LeaveRequestStatus.PENDING).toBeDefined();
    expect(LeaveRequestStatus.APPROVED).toBeDefined();
    expect(LeaveRequestStatus.REJECTED).toBeDefined();
  });

  it('supports a LeaveRequest-shaped object with required fields', () => {
    const request = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: LeaveType.ANNUAL,
      status: LeaveRequestStatus.PENDING,
    };

    expect(request.id).toBe('leave-1');
    expect(request.employeeId).toBe('employee-1');
    expect(request.leaveType).toBe(LeaveType.ANNUAL);
    expect(request.status).toBe(LeaveRequestStatus.PENDING);
  });

  it('does not expose unexpected enum values used by this phase', () => {
    expect(Object.values(LeaveType)).not.toContain('VACATION');
    expect(Object.values(LeaveRequestStatus)).not.toContain('CANCELLED');
  });
});
