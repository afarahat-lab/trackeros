import {
  LeaveStatus,
  LeaveType,
  LeaveAction,
  NotificationType,
  EmploymentStatus,
  AuditAction,
} from 'shared/types';

describe('shared/types barrel', () => {
  it('should re-export all enums from the barrel index', () => {
    expect(LeaveStatus).toBeDefined();
    expect(LeaveType).toBeDefined();
    expect(LeaveAction).toBeDefined();
    expect(NotificationType).toBeDefined();
    expect(EmploymentStatus).toBeDefined();
    expect(AuditAction).toBeDefined();
  });
});

describe('LeaveStatus', () => {
  it('should have all expected values', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 values', () => {
    expect(Object.keys(LeaveStatus).length).toBe(5);
  });
});

describe('LeaveType', () => {
  it('should have all expected values', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });

  it('should have exactly 6 values', () => {
    expect(Object.keys(LeaveType).length).toBe(6);
  });
});

describe('LeaveAction', () => {
  it('should have all expected values', () => {
    expect(LeaveAction.CREATE).toBe('CREATE');
    expect(LeaveAction.SUBMIT).toBe('SUBMIT');
    expect(LeaveAction.APPROVE).toBe('APPROVE');
    expect(LeaveAction.REJECT).toBe('REJECT');
    expect(LeaveAction.CANCEL).toBe('CANCEL');
    expect(LeaveAction.UPDATE).toBe('UPDATE');
    expect(LeaveAction.DELETE).toBe('DELETE');
  });

  it('should have exactly 7 values', () => {
    expect(Object.keys(LeaveAction).length).toBe(7);
  });
});

describe('NotificationType', () => {
  it('should have all expected values', () => {
    expect(NotificationType.LEAVE_SUBMITTED).toBe('LEAVE_SUBMITTED');
    expect(NotificationType.LEAVE_APPROVED).toBe('LEAVE_APPROVED');
    expect(NotificationType.LEAVE_REJECTED).toBe('LEAVE_REJECTED');
    expect(NotificationType.LEAVE_CANCELLED).toBe('LEAVE_CANCELLED');
    expect(NotificationType.BALANCE_UPDATED).toBe('BALANCE_UPDATED');
  });

  it('should have exactly 5 values', () => {
    expect(Object.keys(NotificationType).length).toBe(5);
  });
});

describe('EmploymentStatus', () => {
  it('should have all expected values', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });

  it('should have exactly 3 values', () => {
    expect(Object.keys(EmploymentStatus).length).toBe(3);
  });
});

describe('AuditAction', () => {
  it('should have all expected values', () => {
    expect(AuditAction.CREATE).toBe('CREATE');
    expect(AuditAction.UPDATE).toBe('UPDATE');
    expect(AuditAction.DELETE).toBe('DELETE');
    expect(AuditAction.APPROVE).toBe('APPROVE');
    expect(AuditAction.REJECT).toBe('REJECT');
  });

  it('should have exactly 5 values', () => {
    expect(Object.keys(AuditAction).length).toBe(5);
  });
});
