import { describe, it, expect } from 'vitest';

// Import the LeaveRequest interface
import type { LeaveRequest } from '../../../src/modules/leave/leave.model';

describe('SC-1: LeaveRequest Model', () => {
  it('should have the correct properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-123',
      leaveType: 'sick',
      startDate: new Date(),
      endDate: new Date(),
      status: 'pending'
    };

    expect(leaveRequest).toHaveProperty('id');
    expect(leaveRequest).toHaveProperty('employeeId');
    expect(leaveRequest).toHaveProperty('leaveType');
    expect(leaveRequest).toHaveProperty('startDate');
    expect(leaveRequest).toHaveProperty('endDate');
    expect(leaveRequest).toHaveProperty('status');
  });
});