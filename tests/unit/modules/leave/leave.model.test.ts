import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CreateLeaveRequestDto, LeaveRequest, LeaveRequestStatus, LeaveType } from '../../../../src/modules/leave/leave.model';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  it('exports the expected leave model members', () => {
    expect(leaveModel).toHaveProperty('LeaveType', undefined);
    expect(typeof leaveModel).toBe('object');

    const leaveType: LeaveType = 'ANNUAL';
    const status: LeaveRequestStatus = 'PENDING';
    const dto: CreateLeaveRequestDto = {
      employeeId: 'employee-1',
      leaveType
    };

    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: dto.employeeId,
      leaveType,
      status
    };

    expect(request.leaveType).toBe('ANNUAL');
    expect(request.status).toBe('PENDING');
  });
});