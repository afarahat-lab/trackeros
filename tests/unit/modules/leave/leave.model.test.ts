import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../src/modules/leave/leave.model';
import { LeaveType, LeaveStatus } from '../../../src/shared/types/index';

describe('Leave Module Foundation', () => {
  describe('LeaveRequest Interface', () => {
    it('should have the correct properties', () => {
      const leaveRequest: LeaveRequest = {
        id: '1',
        employeeId: 'emp123',
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Pending,
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Medical',
        managerId: 'mgr123',
      };

      expect(leaveRequest).toHaveProperty('id');
      expect(leaveRequest).toHaveProperty('employeeId');
      expect(leaveRequest).toHaveProperty('leaveType');
      expect(leaveRequest).toHaveProperty('status');
      expect(leaveRequest).toHaveProperty('startDate');
      expect(leaveRequest).toHaveProperty('endDate');
      expect(leaveRequest).toHaveProperty('reason');
      expect(leaveRequest).toHaveProperty('managerId');
    });
  });

  describe('CreateLeaveRequestDto Interface', () => {
    it('should have the correct properties', () => {
      const createLeaveRequestDto: CreateLeaveRequestDto = {
        employeeId: 'emp123',
        leaveType: LeaveType.Sick,
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Medical',
      };

      expect(createLeaveRequestDto).toHaveProperty('employeeId');
      expect(createLeaveRequestDto).toHaveProperty('leaveType');
      expect(createLeaveRequestDto).toHaveProperty('startDate');
      expect(createLeaveRequestDto).toHaveProperty('endDate');
      expect(createLeaveRequestDto).toHaveProperty('reason');
    });
  });
});
