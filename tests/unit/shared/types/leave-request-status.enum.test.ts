import { LeaveRequestStatus } from 'shared/types';

describe('LeaveRequestStatus', () => {
  it('should have exactly the members DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED', () => {
    const members = Object.keys(LeaveRequestStatus);
    expect(members).toHaveLength(5);
    expect(members).toContain('DRAFT');
    expect(members).toContain('SUBMITTED');
    expect(members).toContain('APPROVED');
    expect(members).toContain('REJECTED');
    expect(members).toContain('CANCELLED');
  });

  it('should map each member to a distinct string value', () => {
    const values = Object.values(LeaveRequestStatus);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should have DRAFT = "DRAFT"', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
  });

  it('should have SUBMITTED = "SUBMITTED"', () => {
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should have APPROVED = "APPROVED"', () => {
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED = "REJECTED"', () => {
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED = "CANCELLED"', () => {
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});
