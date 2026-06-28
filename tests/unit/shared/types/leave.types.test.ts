import { LeaveType, LeaveStatus } from '../../../../src/shared/types/leave.types';

describe('LeaveType enum', () => {
  it('should define ANNUAL', () => {
    expect(LeaveType.ANNUAL).toBeDefined();
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should define SICK', () => {
    expect(LeaveType.SICK).toBeDefined();
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should define EMERGENCY', () => {
    expect(LeaveType.EMERGENCY).toBeDefined();
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly 3 values', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(3);
    expect(values).toContain('ANNUAL');
    expect(values).toContain('SICK');
    expect(values).toContain('EMERGENCY');
  });
});

describe('LeaveStatus enum', () => {
  it('should define PENDING', () => {
    expect(LeaveStatus.PENDING).toBeDefined();
    expect(LeaveStatus.PENDING).toBe('PENDING');
  });

  it('should define APPROVED', () => {
    expect(LeaveStatus.APPROVED).toBeDefined();
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should define REJECTED', () => {
    expect(LeaveStatus.REJECTED).toBeDefined();
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should define CANCELLED', () => {
    expect(LeaveStatus.CANCELLED).toBeDefined();
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 4 values', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toHaveLength(4);
    expect(values).toContain('PENDING');
    expect(values).toContain('APPROVED');
    expect(values).toContain('REJECTED');
    expect(values).toContain('CANCELLED');
  });
});
