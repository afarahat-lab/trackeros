import { LeaveRequestStatus } from 'modules/LeaveStatus/LeaveStatus.model';

describe('LeaveRequestStatus', () => {
  it('should have PENDING member', () => {
    expect(LeaveRequestStatus.PENDING).toBe('PENDING');
  });

  it('should have APPROVED member', () => {
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED member', () => {
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED member', () => {
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly four members', () => {
    const members = Object.keys(LeaveRequestStatus).filter((k) =>
      isNaN(Number(k)),
    );
    expect(members).toHaveLength(4);
    expect(members).toEqual(
      expect.arrayContaining(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    );
  });
});
