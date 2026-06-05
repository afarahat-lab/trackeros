import { describe, it, expect } from '@jest/globals';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../src/modules/leave/leave.model';
import { LeaveType, LeaveStatus } from '../../../src/shared/types';

describe('SC-1: Leave module foundation', () => {
  it('should create a LeaveRequest with correct properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp123',
      leaveType: LeaveType.Sick,
      status: LeaveStatus.Pending,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-10'),
      reason: 'Flu',
      managerId: 'mgr456'
    };

    expect(leaveRequest).toHaveProperty('id', '1');
    expect(leaveRequest).toHaveProperty('employeeId', 'emp123');
    expect(leaveRequest).toHaveProperty('leaveType', LeaveType.Sick);
    expect(leaveRequest).toHaveProperty('status', LeaveStatus.Pending);
    expect(leaveRequest).toHaveProperty('startDate', new Date('2023-01-01'));
    expect(leaveRequest).toHaveProperty('endDate', new Date('2023-01-10'));
    expect(leaveRequest).toHaveProperty('reason', 'Flu');
    expect(leaveRequest).toHaveProperty('managerId', 'mgr456');
  });

  it('should create a CreateLeaveRequestDto with correct properties', () => {
    const createLeaveRequestDto: CreateLeaveRequestDto = {
      employeeId: 'emp123',
      leaveType: LeaveType.Vacation,
      startDate: new Date('2023-02-01'),
      endDate: new Date('2023-02-10'),
      reason: 'Family trip'
    };

    expect(createLeaveRequestDto).toHaveProperty('employeeId', 'emp123');
    expect(createLeaveRequestDto).toHaveProperty('leaveType', LeaveType.Vacation);
    expect(createLeaveRequestDto).toHaveProperty('startDate', new Date('2023-02-01'));
    expect(createLeaveRequestDto).toHaveProperty('endDate', new Date('2023-02-10'));
    expect(createLeaveRequestDto).toHaveProperty('reason', 'Family trip');
  });
});
