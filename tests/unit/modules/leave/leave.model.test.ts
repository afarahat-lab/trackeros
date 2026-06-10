import { describe, it, expect } from 'vitest';


describe('Leave Model', () => {
  it('should export LeaveRequest interface', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-123',
      leaveType: 'SICK',
      startDate: new Date(),
      endDate: new Date(),
      status: 'PENDING',
    };
    expect(leaveRequest).toHaveProperty('id');
    expect(leaveRequest).toHaveProperty('employeeId');
    expect(leaveRequest).toHaveProperty('leaveType');
    expect(leaveRequest).toHaveProperty('startDate');
    expect(leaveRequest).toHaveProperty('endDate');
    expect(leaveRequest).toHaveProperty('status');
  });
});