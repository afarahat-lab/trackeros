
import {
  LeaveType,
  LeaveRequestStatus,
  LeaveBalanceStatus,
  EmployeeStatus,
} from '../../../src/shared/types/leave.types';

describe('LeaveType', () => {
  it('should have the correct values', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly three members', () => {
    expect(Object.keys(LeaveType).length).toBe(3);
  });
});

describe('LeaveRequestStatus', () => {
  it('should have the correct values', () => {
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

describe('LeaveBalanceStatus', () => {
  it('should have the correct values', () => {
    expect(LeaveBalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(LeaveBalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(LeaveBalanceStatus.EXPIRED).toBe('EXPIRED');
  });

  it('should have exactly three members', () => {
    expect(Object.keys(LeaveBalanceStatus).length).toBe(3);
  });
});

describe('EmployeeStatus', () => {
  it('should have the correct values', () => {
    expect(EmployeeStatus.ACTIVE).toBe('ACTIVE');
    expect(EmployeeStatus.ON_LEAVE).toBe('ON_LEAVE');
    expect(EmployeeStatus.INACTIVE).toBe('INACTIVE');
    expect(EmployeeStatus.PROBATION).toBe('PROBATION');
  });

  it('should have exactly four members', () => {
    expect(Object.keys(EmployeeStatus).length).toBe(4);
  });
});
