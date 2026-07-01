import { EmploymentStatus, LeaveStatus, BaseEntity } from '../../../src/shared/types';

describe('EmploymentStatus', () => {
  it('should have the correct enum values', () => {
    expect(EmploymentStatus.Active).toBe('Active');
    expect(EmploymentStatus.Inactive).toBe('Inactive');
    expect(EmploymentStatus.Terminated).toBe('Terminated');
    expect(EmploymentStatus.OnLeave).toBe('OnLeave');
  });

  it('should have exactly four members', () => {
    const keys = Object.keys(EmploymentStatus).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(4);
  });
});

describe('LeaveStatus', () => {
  it('should have the correct enum values', () => {
    expect(LeaveStatus.Pending).toBe('Pending');
    expect(LeaveStatus.Approved).toBe('Approved');
    expect(LeaveStatus.Rejected).toBe('Rejected');
    expect(LeaveStatus.Cancelled).toBe('Cancelled');
  });

  it('should have exactly four members', () => {
    const keys = Object.keys(LeaveStatus).filter(k => isNaN(Number(k)));
    expect(keys).toHaveLength(4);
  });
});

describe('BaseEntity', () => {
  it('should allow creating an object conforming to the interface', () => {
    const entity: BaseEntity = {
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

  it('should allow deletedAt to be a Date for soft-deleted entities', () => {
    const entity: BaseEntity = {
      id: '456',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      deletedAt: new Date('2024-01-03'),
    };

    expect(entity.deletedAt).toBeInstanceOf(Date);
  });
});
