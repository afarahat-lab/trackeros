import { describe, it, expect } from 'vitest';

import { LeaveRequest } from '../../../src/modules/leave/leave.model';


describe('SC-1: LeaveRequest Interface', () => {
  it('should have the correct properties', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: '123',
      leaveType: 'SICK', // Assuming LeaveType is a string enum
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-10'),
      status: 'PENDING'
    };

    expect(leaveRequest).toHaveProperty('id');
    expect(leaveRequest).toHaveProperty('employeeId');
    expect(leaveRequest).toHaveProperty('leaveType');
    expect(leaveRequest).toHaveProperty('startDate');
    expect(leaveRequest).toHaveProperty('endDate');
    expect(leaveRequest).toHaveProperty('status');
  });

  it('should enforce correct types', () => {
    const leaveRequest: LeaveRequest = {
      id: '1',
      employeeId: '123',
      leaveType: 'SICK', // Assuming LeaveType is a string enum
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-10'),
      status: 'PENDING'
    };

    expect(typeof leaveRequest.id).toBe('string');
    expect(typeof leaveRequest.employeeId).toBe('string');
    expect(typeof leaveRequest.leaveType).toBe('string');
    expect(leaveRequest.startDate instanceof Date).toBe(true);
    expect(leaveRequest.endDate instanceof Date).toBe(true);
    expect(typeof leaveRequest.status).toBe('string');
  });
});