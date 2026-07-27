import { LeaveStatus, LeaveType } from '../../../../src/shared/types/leave.enums';

describe('LeaveStatus', () => {
  it('should have the correct values', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(LeaveStatus).length).toBe(5);
  });
});

describe('LeaveType', () => {
  it('should have the correct values', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(LeaveType).length).toBe(6);
  });
});
