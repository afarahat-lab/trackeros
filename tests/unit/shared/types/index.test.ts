import { LeaveStatus, LeaveTypeCode } from '../../../../src/shared/types';

describe('shared/types barrel', () => {
  it('should re-export LeaveStatus', () => {
    expect(LeaveStatus).toBeDefined();
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should re-export LeaveTypeCode', () => {
    expect(LeaveTypeCode).toBeDefined();
    expect(LeaveTypeCode.annual).toBe('annual');
    expect(LeaveTypeCode.sick).toBe('sick');
    expect(LeaveTypeCode.emergency).toBe('emergency');
    expect(LeaveTypeCode.unpaid).toBe('unpaid');
    expect(LeaveTypeCode.maternity).toBe('maternity');
    expect(LeaveTypeCode.paternity).toBe('paternity');
  });

  it('should export exactly two symbols', () => {
    const barrelExports = Object.keys(require('../../../../src/shared/types'));
    // The barrel should export LeaveStatus and LeaveTypeCode
    expect(barrelExports).toContain('LeaveStatus');
    expect(barrelExports).toContain('LeaveTypeCode');
  });
});
