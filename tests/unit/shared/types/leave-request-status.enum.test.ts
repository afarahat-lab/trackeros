import { LeaveRequestStatus, LEAVE_REQUEST_STATUS_VALUES } from '../../../../src/shared/types/leave-request-status.enum';

describe('LeaveRequestStatus', () => {
  const expectedValues = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

  it('should have exactly five values', () => {
    expect(LEAVE_REQUEST_STATUS_VALUES).toHaveLength(5);
  });

  it.each(expectedValues)('should contain the value %s', (value) => {
    expect(LEAVE_REQUEST_STATUS_VALUES).toContain(value);
  });

  it('should have the correct constant keys mapping to values', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have no duplicate values', () => {
    const uniqueValues = new Set(LEAVE_REQUEST_STATUS_VALUES);
    expect(uniqueValues.size).toBe(LEAVE_REQUEST_STATUS_VALUES.length);
  });

  it('should have LEAVE_REQUEST_STATUS_VALUES containing all LeaveRequestStatus constant values', () => {
    const allConstantValues = Object.values(LeaveRequestStatus);
    expect(LEAVE_REQUEST_STATUS_VALUES).toEqual(allConstantValues);
  });
});
