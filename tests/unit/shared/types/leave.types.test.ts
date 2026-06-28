import { LeaveType, LeaveStatus } from '../../../../src/shared/types/leave.types';

describe('LeaveType enum', () => {
  it('should define ANNUAL', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
  });

  it('should define SICK', () => {
    expect(LeaveType.SICK).toBe('SICK');
  });

  it('should define EMERGENCY', () => {
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
  });

  it('should have exactly 3 members', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(3);
  });

  it('should contain only expected values', () => {
    const values = Object.values(LeaveType);
    expect(values).toEqual(
      expect.arrayContaining(['ANNUAL', 'SICK', 'EMERGENCY']),
    );
  });
});

describe('LeaveStatus enum', () => {
  it('should define PENDING', () => {
    expect(LeaveStatus.PENDING).toBe('PENDING');
  });

  it('should define APPROVED', () => {
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
  });

  it('should define REJECTED', () => {
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
  });

  it('should define CANCELLED', () => {
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 4 members', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toHaveLength(4);
  });

  it('should contain only expected values', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toEqual(
      expect.arrayContaining(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    );
  });
});
