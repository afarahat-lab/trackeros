import {
  LeaveType,
  LeaveRequestStatus,
  LeaveBalanceStatus,
  EmploymentStatus,
} from '../../../src/shared/types';

describe('Leave Types and Enums', () => {
  it('should define LeaveType enum correctly', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should define LeaveRequestStatus enum correctly', () => {
    expect(LeaveRequestStatus.PENDING).toBe('PENDING');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should define LeaveBalanceStatus enum correctly', () => {
    expect(LeaveBalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(LeaveBalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(LeaveBalanceStatus.FROZEN).toBe('FROZEN');
  });

  it('should define EmploymentStatus enum correctly', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.ON_LEAVE).toBe('ON_LEAVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });
});
