import { LeaveType, LeaveRequestStatus, BalanceStatus } from '../../../src/shared/types';

describe('LeaveType', () => {
  it('should define all expected values', () => {
    expect(LeaveType.Annual).toBe('annual');
    expect(LeaveType.Sick).toBe('sick');
    expect(LeaveType.Emergency).toBe('emergency');
  });

  it('should have distinct values', () => {
    const values = Object.values(LeaveType);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('LeaveRequestStatus', () => {
  it('should define all expected values', () => {
    expect(LeaveRequestStatus.Draft).toBe('draft');
    expect(LeaveRequestStatus.Pending).toBe('pending');
    expect(LeaveRequestStatus.Approved).toBe('approved');
    expect(LeaveRequestStatus.Rejected).toBe('rejected');
    expect(LeaveRequestStatus.Cancelled).toBe('cancelled');
  });

  it('should have distinct values', () => {
    const values = Object.values(LeaveRequestStatus);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('BalanceStatus', () => {
  it('should define all expected values', () => {
    expect(BalanceStatus.Active).toBe('active');
    expect(BalanceStatus.Exhausted).toBe('exhausted');
    expect(BalanceStatus.Frozen).toBe('frozen');
  });

  it('should have distinct values', () => {
    const values = Object.values(BalanceStatus);
    expect(new Set(values).size).toBe(values.length);
  });
});
