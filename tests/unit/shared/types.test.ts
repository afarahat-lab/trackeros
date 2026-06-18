import { LeaveType, LeaveStatus } from '../../../src/shared/types/index';

describe('LeaveType', () => {
  it('should have ANNUAL value', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should have SICK value', () => {
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should have EMERGENCY value', () => {
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have UNPAID value', () => {
    expect(LeaveType.UNPAID).toBe('UNPAID');
  });
});

describe('LeaveStatus', () => {
  it('should have DRAFT value', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
  });

  it('should have SUBMITTED value', () => {
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should have PENDING_APPROVAL value', () => {
    expect(LeaveStatus.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
  });

  it('should have APPROVED value', () => {
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED value', () => {
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED value', () => {
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });
});
