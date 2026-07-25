import {
  LeaveStatus,
  LeaveTypeCode,
  PolicyStatus,
  BalanceStatus,
} from '../../../../src/shared/types/leave.enums';

describe('LeaveStatus', () => {
  it('should have the expected members', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(LeaveStatus).length).toBe(6);
  });
});

describe('LeaveTypeCode', () => {
  it('should have the expected members', () => {
    expect(LeaveTypeCode.ANNUAL).toBe('ANNUAL');
    expect(LeaveTypeCode.SICK).toBe('SICK');
    expect(LeaveTypeCode.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(LeaveTypeCode).length).toBe(3);
  });
});

describe('PolicyStatus', () => {
  it('should have the expected members', () => {
    expect(PolicyStatus.ACTIVE).toBe('ACTIVE');
    expect(PolicyStatus.SUPERSEDED).toBe('SUPERSEDED');
    expect(PolicyStatus.REVOKED).toBe('REVOKED');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(PolicyStatus).length).toBe(3);
  });
});

describe('BalanceStatus', () => {
  it('should have the expected members', () => {
    expect(BalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(BalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(BalanceStatus.FROZEN).toBe('FROZEN');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(BalanceStatus).length).toBe(3);
  });
});
