
import { LeaveType } from '../../../../src/shared/types/leave.types';
import { LeavePolicy, LeavePolicyQueryParams } from '../../../../src/modules/policy/policy.model';

describe('LeavePolicy', () => {
  const validPolicy: LeavePolicy = {
    id: 1,
    policyName: 'Annual Leave Standard',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    allowNegativeBalance: false,
    maxConsecutiveDays: 10,
    fiscalYear: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('should have all required fields', () => {
    expect(validPolicy.id).toBe(1);
    expect(validPolicy.policyName).toBe('Annual Leave Standard');
    expect(validPolicy.leaveType).toBe(LeaveType.ANNUAL);
    expect(validPolicy.entitlementDays).toBe(20);
    expect(validPolicy.accrualRate).toBe(1.67);
    expect(validPolicy.maxAccumulation).toBe(30);
    expect(validPolicy.minimumNoticeDays).toBe(7);
    expect(validPolicy.requiresManagerApproval).toBe(true);
    expect(validPolicy.isActive).toBe(true);
    expect(validPolicy.allowNegativeBalance).toBe(false);
    expect(validPolicy.maxConsecutiveDays).toBe(10);
    expect(validPolicy.fiscalYear).toBe(2026);
    expect(validPolicy.createdAt).toBeInstanceOf(Date);
    expect(validPolicy.updatedAt).toBeInstanceOf(Date);
  });

  it('should support different leave types', () => {
    const sickPolicy: LeavePolicy = {
      ...validPolicy,
      id: 2,
      policyName: 'Sick Leave',
      leaveType: LeaveType.SICK,
      entitlementDays: 10,
    };
    expect(sickPolicy.leaveType).toBe(LeaveType.SICK);
    expect(sickPolicy.entitlementDays).toBe(10);
  });

  it('should support inactive policies', () => {
    const inactivePolicy: LeavePolicy = {
      ...validPolicy,
      isActive: false,
    };
    expect(inactivePolicy.isActive).toBe(false);
  });

  it('should support negative balance', () => {
    const negativeBalancePolicy: LeavePolicy = {
      ...validPolicy,
      allowNegativeBalance: true,
    };
    expect(negativeBalancePolicy.allowNegativeBalance).toBe(true);
  });
});

describe('LeavePolicyQueryParams', () => {
  it('should allow empty params', () => {
    const params: LeavePolicyQueryParams = {};
    expect(params.leaveType).toBeUndefined();
    expect(params.isActive).toBeUndefined();
    expect(params.fiscalYear).toBeUndefined();
  });

  it('should accept all optional filters', () => {
    const params: LeavePolicyQueryParams = {
      leaveType: LeaveType.ANNUAL,
      isActive: true,
      fiscalYear: 2026,
    };
    expect(params.leaveType).toBe(LeaveType.ANNUAL);
    expect(params.isActive).toBe(true);
    expect(params.fiscalYear).toBe(2026);
  });

  it('should accept partial filters', () => {
    const params: LeavePolicyQueryParams = {
      isActive: false,
    };
    expect(params.isActive).toBe(false);
    expect(params.leaveType).toBeUndefined();
    expect(params.fiscalYear).toBeUndefined();
  });
});
