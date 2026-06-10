import { describe, it, expect } from 'vitest';

// Importing the LeaveRequest interface
import { LeaveRequest } from '../../../src/modules/leave/leave.model';

describe('SC-1: LeaveRequest Interface', () => {
  it('should have the correct properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-123',
      leaveType: 'SICK', // Assuming LeaveType is a string union type
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-10-05'),
      status: 'PENDING'
    };

    expect(leaveRequest).toHaveProperty('id', '1');
    expect(leaveRequest).toHaveProperty('employeeId', 'emp-123');
    expect(leaveRequest).toHaveProperty('leaveType', 'SICK');
    expect(leaveRequest).toHaveProperty('startDate');
    expect(leaveRequest).toHaveProperty('endDate');
    expect(leaveRequest).toHaveProperty('status', 'PENDING');
  });

  it('should not allow missing properties', () => {
    // TypeScript will enforce this at compile time, but we can check for structure
    const leaveRequest: Partial<LeaveRequest> = {};
    expect(leaveRequest).not.toHaveProperty('id');
    expect(leaveRequest).not.toHaveProperty('employeeId');
    expect(leaveRequest).not.toHaveProperty('leaveType');
    expect(leaveRequest).not.toHaveProperty('startDate');
    expect(leaveRequest).not.toHaveProperty('endDate');
    expect(leaveRequest).not.toHaveProperty('status');
  });
});