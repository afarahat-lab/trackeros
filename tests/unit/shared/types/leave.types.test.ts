import { LeaveType, LeaveStatus } from '../../../../src/shared/types/leave.types';

describe('Leave Management Enums', () => {
  describe('LeaveType', () => {
    it('should be properly exported', () => {
      expect(LeaveType).toBeDefined();
    });

    it('should have the correct values', () => {
      expect(LeaveType.ANNUAL).toBe('ANNUAL');
      expect(LeaveType.SICK).toBe('SICK');
      expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    });
  });

  describe('LeaveStatus', () => {
    it('should be properly exported', () => {
      expect(LeaveStatus).toBeDefined();
    });

    it('should have the correct values', () => {
      expect(LeaveStatus.PENDING).toBe('PENDING');
      expect(LeaveStatus.APPROVED).toBe('APPROVED');
      expect(LeaveStatus.REJECTED).toBe('REJECTED');
      expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
    });
  });
});
