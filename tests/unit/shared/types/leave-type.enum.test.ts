import { LeaveType } from 'shared/types';

describe('LeaveType', () => {
  it('should have exactly the members ANNUAL, SICK, EMERGENCY', () => {
    const members = Object.keys(LeaveType);
    expect(members).toHaveLength(3);
    expect(members).toContain('ANNUAL');
    expect(members).toContain('SICK');
    expect(members).toContain('EMERGENCY');
  });

  it('should map each member to a distinct string value', () => {
    const values = Object.values(LeaveType);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should have ANNUAL = "ANNUAL"', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should have SICK = "SICK"', () => {
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should have EMERGENCY = "EMERGENCY"', () => {
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });
});
