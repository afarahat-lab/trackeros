import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum';

describe('LeaveTypeCode', () => {
  it('should have exactly six members', () => {
    const members = Object.keys(LeaveTypeCode);
    expect(members).toHaveLength(6);
  });

  it('should have ANNUAL with value "ANNUAL"', () => {
    expect(LeaveTypeCode.ANNUAL).toBe('ANNUAL');
  });

  it('should have SICK with value "SICK"', () => {
    expect(LeaveTypeCode.SICK).toBe('SICK');
  });

  it('should have EMERGENCY with value "EMERGENCY"', () => {
    expect(LeaveTypeCode.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have UNPAID with value "UNPAID"', () => {
    expect(LeaveTypeCode.UNPAID).toBe('UNPAID');
  });

  it('should have MATERNITY with value "MATERNITY"', () => {
    expect(LeaveTypeCode.MATERNITY).toBe('MATERNITY');
  });

  it('should have PATERNITY with value "PATERNITY"', () => {
    expect(LeaveTypeCode.PATERNITY).toBe('PATERNITY');
  });

  it('each member string value should equal its own uppercase name', () => {
    const members = Object.keys(LeaveTypeCode) as Array<keyof typeof LeaveTypeCode>;
    for (const key of members) {
      expect(LeaveTypeCode[key]).toBe(key);
    }
  });
});
