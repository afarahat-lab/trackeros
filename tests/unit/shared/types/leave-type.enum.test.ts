import { LeaveType, LEAVE_TYPE_VALUES } from '../../../../src/shared/types/leave-type.enum';

describe('LeaveType', () => {
  const expectedValues = ['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity'] as const;

  it('should have exactly six values', () => {
    expect(LEAVE_TYPE_VALUES).toHaveLength(6);
  });

  it.each(expectedValues)('should contain the value %s', (value) => {
    expect(LEAVE_TYPE_VALUES).toContain(value);
  });

  it('should have the correct constant keys mapping to values', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });

  it('should have no duplicate values', () => {
    const uniqueValues = new Set(LEAVE_TYPE_VALUES);
    expect(uniqueValues.size).toBe(LEAVE_TYPE_VALUES.length);
  });

  it('should have LEAVE_TYPE_VALUES containing all LeaveType constant values', () => {
    const allConstantValues = Object.values(LeaveType);
    expect(LEAVE_TYPE_VALUES).toEqual(allConstantValues);
  });
});
