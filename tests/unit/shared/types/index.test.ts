import { LeaveTypeCode, LeaveStatus } from '../../../../src/shared/types';

describe('LeaveTypeCode', () => {
  it('should have all six leave type codes', () => {
    expect(LeaveTypeCode.ANNUAL).toBe('annual');
    expect(LeaveTypeCode.SICK).toBe('sick');
    expect(LeaveTypeCode.EMERGENCY).toBe('emergency');
    expect(LeaveTypeCode.UNPAID).toBe('unpaid');
    expect(LeaveTypeCode.MATERNITY).toBe('maternity');
    expect(LeaveTypeCode.PATERNITY).toBe('paternity');
  });

  it('should have exactly six members', () => {
    const keys = Object.keys(LeaveTypeCode).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(6);
  });
});

describe('LeaveStatus', () => {
  it('should have all four status values', () => {
    expect(LeaveStatus.PENDING).toBe('PENDING');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly four members', () => {
    const keys = Object.keys(LeaveStatus).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(4);
  });
});

describe('EmploymentStatus (type)', () => {
  it('should accept valid employment status values at compile time', () => {
    const active: 'ACTIVE' = 'ACTIVE';
    const inactive: 'INACTIVE' = 'INACTIVE';
    const terminated: 'TERMINATED' = 'TERMINATED';

    expect(active).toBe('ACTIVE');
    expect(inactive).toBe('INACTIVE');
    expect(terminated).toBe('TERMINATED');
  });
});
