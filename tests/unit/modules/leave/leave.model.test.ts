import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';
import type { LeaveRequest, CreateLeaveRequestDTO, UpdateLeaveRequestStatusDTO } from '../../../../src/modules/leave/leave.model';

describe('SC-1 leave.model exports', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('exports the required symbols', () => {
    expect(leaveModel).toHaveProperty('LeaveRequestStatus');
    expect(leaveModel).toHaveProperty('LeaveType');
  });

  it('supports the expected LeaveRequest and DTO shapes at compile time', () => {
    const request: LeaveRequest = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL' as never,
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING' as never,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createDto: CreateLeaveRequestDTO = {
      employeeId: 'emp-1',
      leaveType: request.leaveType,
      startDate: new Date(),
      endDate: new Date()
    };

    const updateDto: UpdateLeaveRequestStatusDTO = {
      status: request.status
    };

    expect(createDto.employeeId).toBe('emp-1');
    expect(updateDto.status).toBe(request.status);
  });
});