import { LeaveType, LeaveStatus } from '../../../src/shared/types';

describe('LeaveType', () => {
  it('should define all expected leave type values', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    expect(LeaveType.UNPAID).toBe('UNPAID');
    expect(LeaveType.MATERNITY).toBe('MATERNITY');
    expect(LeaveType.PATERNITY).toBe('PATERNITY');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(LeaveType)).toHaveLength(6);
  });
});

describe('LeaveStatus', () => {
  it('should define all expected leave status values', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(LeaveStatus)).toHaveLength(5);
  });
});
