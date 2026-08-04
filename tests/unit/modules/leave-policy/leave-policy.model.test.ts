import { LeavePolicy } from 'modules/leave-policy';
import { LeaveType } from 'shared/types';

describe('LeavePolicy model', () => {
  const validPolicy: LeavePolicy = {
    id: 'lp-001',
    policyName: 'Annual Leave Standard',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  it('should create a valid LeavePolicy with all required fields', () => {
    expect(validPolicy.id).toBe('lp-001');
    expect(validPolicy.policyName).toBe('Annual Leave Standard');
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

  it('should allow accrualRate to be null', () => {
    const policy: LeavePolicy = { ...validPolicy, accrualRate: null };
    expect(policy.accrualRate).toBeNull();
  });

  it('should allow maxAccumulation to be null', () => {
    const policy: LeavePolicy = { ...validPolicy, maxAccumulation: null };
    expect(policy.maxAccumulation).toBeNull();
  });

  it('should allow minimumNoticeDays to be null', () => {
    const policy: LeavePolicy = { ...validPolicy, minimumNoticeDays: null };
    expect(policy.minimumNoticeDays).toBeNull();
  });

  it('should accept all valid LeaveType enum values', () => {
    const types: LeaveType[] = [LeaveType.ANNUAL, LeaveType.SICK, LeaveType.EMERGENCY];
    for (const leaveType of types) {
      const policy: LeavePolicy = { ...validPolicy, leaveType };
      expect(policy.leaveType).toBe(leaveType);
    }
  });

  it('should have exactly the fields specified in the canonical shape', () => {
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
    const actualFields = Object.keys(validPolicy);
    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
