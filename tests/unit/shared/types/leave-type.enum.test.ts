import { LeaveType } from '../../../../src/shared/types/leave-type.enum';

describe('LeaveType enum', () => {
  it('should have exactly 6 values', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(6);
  });

  it('should contain annual', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
  });

  it('should contain sick', () => {
    expect(LeaveType.SICK).toBe('sick');
  });

  it('should contain emergency', () => {
    expect(LeaveType.EMERGENCY).toBe('emergency');
  });

  it('should contain unpaid', () => {
    expect(LeaveType.UNPAID).toBe('unpaid');
  });

  it('should contain maternity', () => {
    expect(LeaveType.MATERNITY).toBe('maternity');
  });

  it('should contain paternity', () => {
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});
