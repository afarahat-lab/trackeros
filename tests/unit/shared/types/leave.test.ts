import { LeaveType, LeaveRequestStatus, BalanceStatus } from '../../../../src/shared/types/leave';

describe('LeaveType', () => {
  it('should have the correct members', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly three members', () => {
    expect(Object.keys(LeaveType).length).toBe(3);
  });
});

describe('LeaveRequestStatus', () => {
  it('should have the correct members', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly five members', () => {
    expect(Object.keys(LeaveRequestStatus).length).toBe(5);
  });
});

describe('BalanceStatus', () => {
  it('should have the correct members', () => {
    expect(BalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(BalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(BalanceStatus.FROZEN).toBe('FROZEN');
  });

  it('should have exactly three members', () => {
    expect(Object.keys(BalanceStatus).length).toBe(3);
  });
});
