import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum';

describe('LeaveTypeCode', () => {
  it('should have exactly six members', () => {
    const members = Object.keys(LeaveTypeCode);
    expect(members).toHaveLength(6);
  });

  it('should have annual with value "annual"', () => {
    expect(LeaveTypeCode.annual).toBe('annual');
  });

  it('should have sick with value "sick"', () => {
    expect(LeaveTypeCode.sick).toBe('sick');
  });

  it('should have emergency with value "emergency"', () => {
    expect(LeaveTypeCode.emergency).toBe('emergency');
  });

  it('should have unpaid with value "unpaid"', () => {
    expect(LeaveTypeCode.unpaid).toBe('unpaid');
  });

  it('should have maternity with value "maternity"', () => {
    expect(LeaveTypeCode.maternity).toBe('maternity');
  });

  it('should have paternity with value "paternity"', () => {
    expect(LeaveTypeCode.paternity).toBe('paternity');
  });

  it('should be usable as a type assignable to the union of its string literals', () => {
    const code: LeaveTypeCode = LeaveTypeCode.annual;
    expect(code).toBe('annual');

    const values: LeaveTypeCode[] = [
      LeaveTypeCode.annual,
      LeaveTypeCode.sick,
      LeaveTypeCode.emergency,
      LeaveTypeCode.unpaid,
      LeaveTypeCode.maternity,
      LeaveTypeCode.paternity,
    ];
    expect(values).toHaveLength(6);
  });
});
