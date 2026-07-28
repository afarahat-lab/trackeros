import { LeaveType, LeaveRequestStatus, EmploymentStatus } from '../../../src/shared/types/index';

describe('LeaveType', () => {
  it('should have exactly ANNUAL, SICK, EMERGENCY', () => {
    const expected = ['ANNUAL', 'SICK', 'EMERGENCY'];
    const keys = Object.keys(LeaveType);
    expect(keys).toEqual(expect.arrayContaining(expected));
    expect(keys).toHaveLength(expected.length);
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });
});

describe('LeaveRequestStatus', () => {
  it('should have exactly DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED', () => {
    const expected = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const keys = Object.keys(LeaveRequestStatus);
    expect(keys).toEqual(expect.arrayContaining(expected));
    expect(keys).toHaveLength(expected.length);
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('EmploymentStatus', () => {
  it('should have exactly ACTIVE, INACTIVE, TERMINATED, ON_LEAVE', () => {
    const expected = ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'];
    const keys = Object.keys(EmploymentStatus);
    expect(keys).toEqual(expect.arrayContaining(expected));
    expect(keys).toHaveLength(expected.length);
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
    expect(EmploymentStatus.ON_LEAVE).toBe('ON_LEAVE');
  });
});
