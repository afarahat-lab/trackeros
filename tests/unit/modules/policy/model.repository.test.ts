import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';

describe('LeavePolicy Model and Repository', () => {
  it('should define LeavePolicy interface with correct fields', () => {
    const policy: LeavePolicy = {
      id: '1',
      policyName: 'Annual Leave',
      leaveType: 'annual',
      entitlementDays: 20,
      accrualRate: 1.67,
      maxCarryover: 5,
      requiresApproval: true,
      minServiceDays: 90,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    expect(policy).toBeDefined();
    expect(policy.leaveType).toBe('annual');
  });

  it('should define LeavePolicyRepository interface with required methods', () => {
    const repository: LeavePolicyRepository = {
      findById: async (id: string) => null,
      findByPolicyName: async (policyName: string) => null,
      findByLeaveType: async (leaveType: string) => [],
      findAllActive: async () => [],
      save: async (policy) => ({ ...policy, id: '1', createdAt: new Date(), updatedAt: new Date() }),
      update: async (id, updates) => null
    };
    
    expect(repository).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.findByPolicyName).toBeDefined();
    expect(repository.findByLeaveType).toBeDefined();
    expect(repository.findAllActive).toBeDefined();
    expect(repository.save).toBeDefined();
    expect(repository.update).toBeDefined();
  });
});
