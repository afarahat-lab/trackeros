import { LeaveStatus, LeaveType, EmploymentStatus } from '../../../src/shared/types';

describe('LeaveStatus', () => {
  it('should have the correct members', () => {
    expect(LeaveStatus.Pending).toBe('pending');
    expect(LeaveStatus.Approved).toBe('approved');
    expect(LeaveStatus.Rejected).toBe('rejected');
    expect(LeaveStatus.Cancelled).toBe('cancelled');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(LeaveStatus).length).toBe(4);
  });
});

describe('LeaveType', () => {
  it('should have the correct members', () => {
    expect(LeaveType.Annual).toBe('annual');
    expect(LeaveType.Sick).toBe('sick');
    expect(LeaveType.Emergency).toBe('emergency');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(LeaveType).length).toBe(3);
  });
});

describe('EmploymentStatus', () => {
  it('should have the correct members', () => {
    expect(EmploymentStatus.Active).toBe('active');
    expect(EmploymentStatus.Inactive).toBe('inactive');
    expect(EmploymentStatus.Terminated).toBe('terminated');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(EmploymentStatus).length).toBe(3);
  });
});
