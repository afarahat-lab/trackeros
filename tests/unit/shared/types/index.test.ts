import { LeaveStatus, EmploymentStatus } from '../../../../src/shared/types';

describe('LeaveStatus', () => {
  it('should have the correct enum values', () => {
    expect(LeaveStatus.PENDING).toBe('PENDING');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(LeaveStatus).length).toBe(4);
  });
});

describe('EmploymentStatus', () => {
  it('should have the correct enum values', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
    expect(EmploymentStatus.ON_LEAVE).toBe('ON_LEAVE');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(EmploymentStatus).length).toBe(4);
  });
});

describe('BaseEntity', () => {
  it('should allow a valid BaseEntity object', () => {
    const entity = {
      id: '123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      deletedAt: null,
    };

    expect(entity.id).toBe('123');
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(entity.deletedAt).toBeNull();
  });

  it('should allow deletedAt to be a Date', () => {
    const entity = {
      id: '456',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      deletedAt: new Date('2024-06-01'),
    };

    expect(entity.deletedAt).toBeInstanceOf(Date);
  });
});
