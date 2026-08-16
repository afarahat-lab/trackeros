import { LeaveType } from '../../../../src/shared/types';
import { LeavePolicy } from '../../../../src/modules/leave-policy';

describe('LeavePolicy interface', () => {
  const validPolicy: LeavePolicy = {
    id: 'lp-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
  };

  it('should accept a valid LeavePolicy shape with all fields', () => {
    expect(validPolicy.id).toBe('lp-001');
    expect(validPolicy.policyName).toBe('Annual Leave');
    expect(validPolicy.leaveType).toBe(LeaveType.ANNUAL);
    expect(validPolicy.entitlementDays).toBe(20);
    expect(validPolicy.accrualRate).toBe(1.67);
    expect(validPolicy.maxAccumulation).toBe(30);
    expect(validPolicy.minimumNoticeDays).toBe(7);
    expect(validPolicy.requiresManagerApproval).toBe(true);
    expect(validPolicy.isActive).toBe(true);
    expect(validPolicy.createdAt).toBeInstanceOf(Date);
    expect(validPolicy.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow nullable fields to be null', () => {
    const withNulls: LeavePolicy = {
      ...validPolicy,
      id: 'lp-002',
      policyName: 'Sick Leave',
      leaveType: LeaveType.SICK,
      accrualRate: null,
      maxAccumulation: null,
      minimumNoticeDays: null,
    };
    expect(withNulls.accrualRate).toBeNull();
    expect(withNulls.maxAccumulation).toBeNull();
    expect(withNulls.minimumNoticeDays).toBeNull();
  });

  it('should support all LeaveType enum values', () => {
    const leaveTypes: LeaveType[] = [
      LeaveType.ANNUAL,
      LeaveType.SICK,
      LeaveType.EMERGENCY,
      LeaveType.UNPAID,
      LeaveType.MATERNITY,
      LeaveType.PATERNITY,
    ];

    leaveTypes.forEach((leaveType) => {
      const policy: LeavePolicy = {
        ...validPolicy,
        id: `lp-${leaveType}`,
        policyName: `${leaveType} Policy`,
        leaveType,
      };
      expect(policy.leaveType).toBe(leaveType);
    });
  });

  it('should support isActive true (ACTIVE) and false (INACTIVE)', () => {
    const active: LeavePolicy = { ...validPolicy, id: 'lp-active', isActive: true };
    const inactive: LeavePolicy = { ...validPolicy, id: 'lp-inactive', isActive: false };

    expect(active.isActive).toBe(true);
    expect(inactive.isActive).toBe(false);
  });

  it('should support requiresManagerApproval true and false', () => {
    const withApproval: LeavePolicy = {
      ...validPolicy,
      id: 'lp-approval-true',
      requiresManagerApproval: true,
    };
    const withoutApproval: LeavePolicy = {
      ...validPolicy,
      id: 'lp-approval-false',
      requiresManagerApproval: false,
    };

    expect(withApproval.requiresManagerApproval).toBe(true);
    expect(withoutApproval.requiresManagerApproval).toBe(false);
  });

  it('should have exactly the expected field names', () => {
    const expectedFields = [
      'id',
      'policyName',
      'leaveType',
      'entitlementDays',
      'accrualRate',
      'maxAccumulation',
      'minimumNoticeDays',
      'requiresManagerApproval',
      'isActive',
      'createdAt',
      'updatedAt',
    ];

    const actualFields = Object.keys(validPolicy).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(11);
  });
});
