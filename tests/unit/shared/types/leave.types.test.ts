import { LeaveType, LeaveStatus } from '../../../../src/shared/types/leave.types';

describe('LeaveType enum', () => {
  it('should have ANNUAL defined', () => {
    expect(LeaveType.ANNUAL).toBeDefined();
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should have SICK defined', () => {
    expect(LeaveType.SICK).toBeDefined();
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should have EMERGENCY defined', () => {
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
  it('should have PENDING defined', () => {
    expect(LeaveStatus.PENDING).toBeDefined();
    expect(LeaveStatus.PENDING).toBe('PENDING');
  });

  it('should have APPROVED defined', () => {
    expect(LeaveStatus.APPROVED).toBeDefined();
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should have REJECTED defined', () => {
    expect(LeaveStatus.REJECTED).toBeDefined();
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should have CANCELLED defined', () => {
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
