import { LeaveStatus } from '../../../../src/shared/types/leave-status.enum';

describe('LeaveStatus', () => {
  it('should have exactly five members', () => {
    const members = Object.keys(LeaveStatus);
    expect(members).toHaveLength(5);
  });

  it('should have DRAFT with value "DRAFT"', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
  });

  it('should have SUBMITTED with value "SUBMITTED"', () => {
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should have APPROVED with value "APPROVED"', () => {
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED with value "REJECTED"', () => {
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED with value "CANCELLED"', () => {
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should be usable as a type assignable to the union of its string literals', () => {
    const status: LeaveStatus = LeaveStatus.DRAFT;
    expect(status).toBe('DRAFT');

    const values: LeaveStatus[] = [
      LeaveStatus.DRAFT,
      LeaveStatus.SUBMITTED,
      LeaveStatus.APPROVED,
      LeaveStatus.REJECTED,
      LeaveStatus.CANCELLED,
    ];
    expect(values).toHaveLength(5);
  });
});
