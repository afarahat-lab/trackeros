import { LeaveType, LeaveRequestStatus, EmploymentStatus } from '../../../../src/shared/types';

describe('LeaveType', () => {
  it('should have the correct members', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly 3 members', () => {
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

  it('should have exactly 5 members', () => {
    expect(Object.keys(LeaveRequestStatus).length).toBe(5);
  });
});

describe('EmploymentStatus', () => {
  it('should have the correct members', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
    expect(EmploymentStatus.ON_LEAVE).toBe('ON_LEAVE');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(EmploymentStatus).length).toBe(4);
  });
});
