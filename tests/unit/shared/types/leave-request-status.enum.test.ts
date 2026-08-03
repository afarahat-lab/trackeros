import { LeaveRequestStatus } from '../../../../src/shared/types/leave-request-status.enum';

describe('LeaveRequestStatus', () => {
  it('should have exactly five members', () => {
    const members = Object.keys(LeaveRequestStatus);
    expect(members).toHaveLength(5);
  });

  it('should have DRAFT with value "DRAFT"', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
  });

  it('should have SUBMITTED with value "SUBMITTED"', () => {
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should have APPROVED with value "APPROVED"', () => {
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED with value "REJECTED"', () => {
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED with value "CANCELLED"', () => {
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('each member string value should equal its own uppercase name', () => {
    const members = Object.keys(LeaveRequestStatus) as Array<keyof typeof LeaveRequestStatus>;
    for (const key of members) {
      expect(LeaveRequestStatus[key]).toBe(key);
    }
  });
});
