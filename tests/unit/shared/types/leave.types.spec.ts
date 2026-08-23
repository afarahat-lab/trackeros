import { LeaveRequestStatus, LeaveType, AuditAction } from 'shared/types/leave.types';

describe('LeaveRequestStatus', () => {
  it('has exactly five members with expected values', () => {
    expect(Object.keys(LeaveRequestStatus)).toHaveLength(5);
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('LeaveType', () => {
  it('has exactly six members with expected values', () => {
    expect(Object.keys(LeaveType)).toHaveLength(6);
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});

describe('AuditAction', () => {
  it('has exactly seven members with expected values', () => {
    expect(Object.keys(AuditAction)).toHaveLength(7);
    expect(AuditAction.CREATED).toBe('CREATED');
    expect(AuditAction.UPDATED).toBe('UPDATED');
    expect(AuditAction.DELETED).toBe('DELETED');
    expect(AuditAction.APPROVED).toBe('APPROVED');
    expect(AuditAction.REJECTED).toBe('REJECTED');
    expect(AuditAction.CANCELLED).toBe('CANCELLED');
    expect(AuditAction.SUBMITTED).toBe('SUBMITTED');
  });
});
