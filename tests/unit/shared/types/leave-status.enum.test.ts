import { LeaveStatus } from '../../../../src/shared/types/leave-status.enum';

describe('LeaveStatus enum', () => {
  it('should have exactly 5 values', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toHaveLength(5);
  });

  it('should contain DRAFT', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
  });

  it('should contain SUBMITTED', () => {
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should contain APPROVED', () => {
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should contain REJECTED', () => {
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should contain CANCELLED', () => {
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });
});
