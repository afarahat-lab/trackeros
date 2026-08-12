import { LeaveType, LeaveStatus } from '../../../src/shared/types';

describe('LeaveType', () => {
  it('should contain all expected leave type values', () => {
    const expectedValues: LeaveType[] = [
      LeaveType.ANNUAL,
      LeaveType.SICK,
      LeaveType.EMERGENCY,
      LeaveType.UNPAID,
      LeaveType.MATERNITY,
      LeaveType.PATERNITY,
    ];

    expect(expectedValues).toHaveLength(6);

    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});

describe('LeaveStatus', () => {
  it('should contain all expected leave status values', () => {
    const expectedValues: LeaveStatus[] = [
      LeaveStatus.DRAFT,
      LeaveStatus.SUBMITTED,
      LeaveStatus.APPROVED,
      LeaveStatus.REJECTED,
      LeaveStatus.CANCELLED,
    ];

    expect(expectedValues).toHaveLength(5);

    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });
});
