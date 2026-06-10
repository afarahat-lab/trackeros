import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  LeaveType,
  LeaveRequestStatus,
  LeaveRequest,
  CreateLeaveRequestDto
} from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports all documented LeaveType values', () => {
    const values: LeaveType[] = ['ANNUAL', 'SICK', 'EMERGENCY'];
    expect(values).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
  });

  it('supports all documented LeaveRequestStatus values', () => {
    const values: LeaveRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
    expect(values).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('allows LeaveRequest and CreateLeaveRequestDto shapes as specified', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'employee-1',
      leaveType: 'ANNUAL'
    };

    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      status: 'PENDING'
    };

    expect(request).toEqual({
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'ANNUAL',
      status: 'PENDING'
    });
  });
});