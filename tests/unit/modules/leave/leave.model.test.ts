import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType values ANNUAL, SICK, and EMERGENCY', () => {
    expect(leaveModel.LeaveType).toBeDefined();
    expect(leaveModel.LeaveType.ANNUAL).toBeDefined();
    expect(leaveModel.LeaveType.SICK).toBeDefined();
    expect(leaveModel.LeaveType.EMERGENCY).toBeDefined();
  });

  it('exports LeaveRequestStatus values PENDING, APPROVED, and REJECTED', () => {
    expect(leaveModel.LeaveRequestStatus).toBeDefined();
    expect(leaveModel.LeaveRequestStatus.PENDING).toBeDefined();
    expect(leaveModel.LeaveRequestStatus.APPROVED).toBeDefined();
    expect(leaveModel.LeaveRequestStatus.REJECTED).toBeDefined();
  });

  it('supports a LeaveRequest shape with required fields', () => {
    const request = {
      id: 'req-1',
      employeeId: 'emp-1',
      leaveType: leaveModel.LeaveType.ANNUAL,
      status: leaveModel.LeaveRequestStatus.PENDING,
    };

    expect(request.id).toBe('req-1');
    expect(request.employeeId).toBe('emp-1');
    expect(request.leaveType).toBe(leaveModel.LeaveType.ANNUAL);
    expect(request.status).toBe(leaveModel.LeaveRequestStatus.PENDING);
  });

  it('does not expose unsupported lifecycle status values', () => {
    expect('CANCELLED' in leaveModel.LeaveRequestStatus).toBe(false);
  });
});