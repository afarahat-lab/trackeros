import { LeaveType, LeaveRequestStatus, BalanceStatus } from '../../../../src/shared/types/leave.enums';

describe('LeaveType', () => {
  it('should have exactly three members', () => {
    const keys = Object.keys(LeaveType);
    expect(keys).toHaveLength(3);
  });

  it('should contain ANNUAL', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should contain SICK', () => {
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should contain EMERGENCY', () => {
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });
});

describe('LeaveRequestStatus', () => {
  it('should have exactly five members', () => {
    const keys = Object.keys(LeaveRequestStatus);
    expect(keys).toHaveLength(5);
  });

  it('should contain DRAFT', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
  });

  it('should contain SUBMITTED', () => {
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should contain APPROVED', () => {
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
  });

  it('should contain REJECTED', () => {
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
  });

  it('should contain CANCELLED', () => {
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('BalanceStatus', () => {
  it('should have exactly three members', () => {
    const keys = Object.keys(BalanceStatus);
    expect(keys).toHaveLength(3);
  });

  it('should contain ACTIVE', () => {
    expect(BalanceStatus.ACTIVE).toBe('ACTIVE');
  });

  it('should contain EXHAUSTED', () => {
    expect(BalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
  });

  it('should contain EXPIRED', () => {
    expect(BalanceStatus.EXPIRED).toBe('EXPIRED');
  });
});
