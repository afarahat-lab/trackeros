import { BaseEntity, LeaveType, LeaveRequestStatus } from 'shared/types';

describe('BaseEntity', () => {
  it('should have the correct shape', () => {
    const entity: BaseEntity = {
      id: 'abc-123',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-06-15'),
    };

    expect(typeof entity.id).toBe('string');
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });
});

describe('LeaveType', () => {
  it('should have exactly six members', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(6);
  });

  it('should contain all expected values', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    expect(LeaveType.UNPAID).toBe('UNPAID');
    expect(LeaveType.MATERNITY).toBe('MATERNITY');
    expect(LeaveType.PATERNITY).toBe('PATERNITY');
  });
});

describe('LeaveRequestStatus', () => {
  it('should have exactly five members', () => {
    const values = Object.values(LeaveRequestStatus);
    expect(values).toHaveLength(5);
  });

  it('should contain all expected lifecycle states', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});
