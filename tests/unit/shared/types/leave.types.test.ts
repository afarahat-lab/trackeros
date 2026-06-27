import {
  LeaveType,
  LeaveStatus,
  NotificationType,
  AuditAction,
  EntityType,
} from '../../../../src/shared/types/leave.types';

describe('Leave Types Enums', () => {
  describe('LeaveType', () => {
    it('should have correct values', () => {
      expect(LeaveType.ANNUAL).toBe('ANNUAL');
      expect(LeaveType.SICK).toBe('SICK');
      expect(LeaveType.MATERNITY).toBe('MATERNITY');
      expect(LeaveType.PATERNITY).toBe('PATERNITY');
      expect(LeaveType.UNPAID).toBe('UNPAID');
      expect(LeaveType.OTHER).toBe('OTHER');
    });

    it('should have exactly 6 members', () => {
      const values = Object.values(LeaveType);
      expect(values).toHaveLength(6);
    });
  });

  describe('LeaveStatus', () => {
    it('should have correct values', () => {
      expect(LeaveStatus.PENDING).toBe('PENDING');
      expect(LeaveStatus.APPROVED).toBe('APPROVED');
      expect(LeaveStatus.REJECTED).toBe('REJECTED');
      expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have exactly 4 members', () => {
      const values = Object.values(LeaveStatus);
      expect(values).toHaveLength(4);
    });
  });

  describe('NotificationType', () => {
    it('should have correct values', () => {
      expect(NotificationType.LEAVE_REQUEST_CREATED).toBe('LEAVE_REQUEST_CREATED');
      expect(NotificationType.LEAVE_REQUEST_APPROVED).toBe('LEAVE_REQUEST_APPROVED');
      expect(NotificationType.LEAVE_REQUEST_REJECTED).toBe('LEAVE_REQUEST_REJECTED');
      expect(NotificationType.LEAVE_REQUEST_CANCELLED).toBe('LEAVE_REQUEST_CANCELLED');
      expect(NotificationType.LEAVE_BALANCE_LOW).toBe('LEAVE_BALANCE_LOW');
      expect(NotificationType.LEAVE_BALANCE_EXPIRING).toBe('LEAVE_BALANCE_EXPIRING');
    });

    it('should have exactly 6 members', () => {
      const values = Object.values(NotificationType);
      expect(values).toHaveLength(6);
    });
  });

  describe('AuditAction', () => {
    it('should have correct values', () => {
      expect(AuditAction.CREATE).toBe('CREATE');
      expect(AuditAction.UPDATE).toBe('UPDATE');
      expect(AuditAction.DELETE).toBe('DELETE');
    });

    it('should have exactly 3 members', () => {
      const values = Object.values(AuditAction);
      expect(values).toHaveLength(3);
    });
  });

  describe('EntityType', () => {
    it('should have correct values', () => {
      expect(EntityType.LEAVE_REQUEST).toBe('LEAVE_REQUEST');
      expect(EntityType.LEAVE_BALANCE).toBe('LEAVE_BALANCE');
      expect(EntityType.LEAVE_POLICY).toBe('LEAVE_POLICY');
      expect(EntityType.EMPLOYEE).toBe('EMPLOYEE');
      expect(EntityType.NOTIFICATION).toBe('NOTIFICATION');
    });

    it('should have exactly 5 members', () => {
      const values = Object.values(EntityType);
      expect(values).toHaveLength(5);
    });
  });
});
