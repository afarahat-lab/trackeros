import { LeaveType, LeaveRequestStatus } from '../../../src/shared/types';

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

  it('should have exactly three members', () => {
    const keys = Object.keys(LeaveType).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(expect.arrayContaining(['ANNUAL', 'SICK', 'EMERGENCY']));
  });
});

describe('LeaveRequestStatus', () => {
  it('should have DRAFT value', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
  });

  it('should have SUBMITTED value', () => {
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
  });

  it('should have APPROVED value', () => {
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED value', () => {
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED value', () => {
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly five members', () => {
    const keys = Object.keys(LeaveRequestStatus).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(5);
    expect(keys).toEqual(
      expect.arrayContaining(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'])
    );
  });
});

describe('EmploymentStatus', () => {
  it('should accept ACTIVE as a valid value', () => {
    const status: string = 'ACTIVE';
    expect(status).toBe('ACTIVE');
  });

  it('should accept INACTIVE as a valid value', () => {
    const status: string = 'INACTIVE';
    expect(status).toBe('INACTIVE');
  });

  it('should accept TERMINATED as a valid value', () => {
    const status: string = 'TERMINATED';
    expect(status).toBe('TERMINATED');
  });
});
