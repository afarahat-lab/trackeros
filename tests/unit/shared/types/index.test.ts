import { LeaveRequestStatus, LeaveType, AuditAction } from '../../../../src/shared/types';

describe('LeaveRequestStatus', () => {
  it('should have exactly five members', () => {
    const members = Object.keys(LeaveRequestStatus).filter((k) =>
      isNaN(Number(k)),
    );
    expect(members).toHaveLength(5);
  });

  it('should include DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have distinct values', () => {
    const values = Object.values(LeaveRequestStatus);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('LeaveType', () => {
  it('should have exactly six members', () => {
    const members = Object.keys(LeaveType).filter((k) => isNaN(Number(k)));
    expect(members).toHaveLength(6);
  });

  it('should include ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    expect(LeaveType.UNPAID).toBe('UNPAID');
    expect(LeaveType.MATERNITY).toBe('MATERNITY');
    expect(LeaveType.PATERNITY).toBe('PATERNITY');
  });

  it('should have distinct values', () => {
    const values = Object.values(LeaveType);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('AuditAction', () => {
  it('should have exactly seven members', () => {
    const members = Object.keys(AuditAction).filter((k) => isNaN(Number(k)));
    expect(members).toHaveLength(7);
  });

  it('should include CREATED, UPDATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, DELETED', () => {
    expect(AuditAction.CREATED).toBe('CREATED');
    expect(AuditAction.UPDATED).toBe('UPDATED');
    expect(AuditAction.SUBMITTED).toBe('SUBMITTED');
    expect(AuditAction.APPROVED).toBe('APPROVED');
    expect(AuditAction.REJECTED).toBe('REJECTED');
    expect(AuditAction.CANCELLED).toBe('CANCELLED');
    expect(AuditAction.DELETED).toBe('DELETED');
  });

  it('should have distinct values', () => {
    const values = Object.values(AuditAction);
    expect(new Set(values).size).toBe(values.length);
  });
});
