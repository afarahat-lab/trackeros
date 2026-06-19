import { LeavePolicyDto } from '../../../../src/modules/policy/policy.dto';

describe('Policy DTO', () => {
  it('should allow valid LeavePolicyDto', () => {
    const dto: LeavePolicyDto = {
      id: 'pol-1',
      policyName: 'Annual Leave',
      leaveType: 'annual',
      entitlementDays: 20,
      accrualRate: 1.67,
      maxCarryover: 5,
      requiresApproval: true,
      minServiceDays: 90,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(dto.id).toBe('pol-1');
  });
});
