import { describe, it, expect } from 'vitest';

// Importing the LeaveRequest interface from the leave model
import LeaveRequest from 'src/modules/leave/leave.model';

describe('SC-1: LeaveRequest Interface', () => {
  it('should have the correct properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-123',
      leaveType: 'sick',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-05'),
      status: 'pending'
    };

    expect(leaveRequest).toHaveProperty('id');
    expect(leaveRequest).toHaveProperty('employeeId');
    expect(leaveRequest).toHaveProperty('leaveType');
    expect(leaveRequest).toHaveProperty('startDate');
    expect(leaveRequest).toHaveProperty('endDate');
    expect(leaveRequest).toHaveProperty('status');
  });

  it('should enforce correct types for properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-123',
      leaveType: 'sick',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-05'),
      status: 'pending'
    };

    expect(typeof leaveRequest.id).toBe('string');
    expect(typeof leaveRequest.employeeId).toBe('string');
    expect(typeof leaveRequest.leaveType).toBe('string');
    expect(leaveRequest.startDate instanceof Date).toBe(true);
    expect(leaveRequest.endDate instanceof Date).toBe(true);
    expect(typeof leaveRequest.status).toBe('string');
  });
});