import { LeaveType } from 'modules/LeaveType/LeaveType.model';

describe('LeaveType', () => {
  it('should have ANNUAL member', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should have SICK member', () => {
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should have EMERGENCY member', () => {
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly three members', () => {
    const members = Object.keys(LeaveType).filter((k) => isNaN(Number(k)));
    expect(members).toHaveLength(3);
    expect(members).toEqual(
      expect.arrayContaining(['ANNUAL', 'SICK', 'EMERGENCY']),
    );
  });
});
