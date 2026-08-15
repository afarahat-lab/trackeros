import {
  LeaveType,
  LeaveRequestStatus,
  BalanceStatus,
  AuditAction,
  EmploymentStatus,
} from '../../../../src/shared/types';

describe('LeaveType', () => {
  it('should have all canonical members', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});

describe('LeaveRequestStatus', () => {
  it('should have all canonical members', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('BalanceStatus', () => {
  it('should have all canonical members', () => {
    expect(BalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(BalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(BalanceStatus.FROZEN).toBe('FROZEN');
    expect(BalanceStatus.CLOSED).toBe('CLOSED');
  });
});

describe('AuditAction', () => {
  it('should have all canonical members', () => {
    expect(AuditAction.CREATED).toBe('CREATED');
    expect(AuditAction.UPDATED).toBe('UPDATED');
    expect(AuditAction.DELETED).toBe('DELETED');
    expect(AuditAction.SUBMITTED).toBe('SUBMITTED');
    expect(AuditAction.APPROVED).toBe('APPROVED');
    expect(AuditAction.REJECTED).toBe('REJECTED');
    expect(AuditAction.CANCELLED).toBe('CANCELLED');
  });
});

describe('EmploymentStatus', () => {
  it('should have all canonical members', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });
});
