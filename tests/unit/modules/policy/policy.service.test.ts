import { LeavePolicy, LeavePolicyQueryParams } from '../../../../src/modules/policy/policy.model';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { PolicyService } from '../../../../src/modules/policy/policy.service';
import { IPolicyService } from '../../../../src/modules/policy/policy.service.interface';
import { LeaveType } from '../../../../src/shared/types/leave.types';

class MockLeavePolicyRepository implements ILeavePolicyRepository {
  private policies: LeavePolicy[] = [];

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    return this.policies.filter((p) => p.leaveType === leaveType);
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    return this.policies.find((p) => p.id === id) ?? null;
  }

  async findAll(params?: LeavePolicyQueryParams): Promise<LeavePolicy[]> {
    let result = [...this.policies];
    if (params?.leaveType) {
      result = result.filter((p) => p.leaveType === params.leaveType);
    }
    if (params?.isActive !== undefined) {
      result = result.filter((p) => p.isActive === params.isActive);
    }
    return result;
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const now = new Date();
    const newPolicy: LeavePolicy = {
      ...policy,
      id: `policy-${this.policies.length + 1}`,
      createdAt: now,
      updatedAt: now,
    };
    this.policies.push(newPolicy);
    return newPolicy;
  }

  async update(
    id: string,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeavePolicy | null> {
    const index = this.policies.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.policies[index] = {
      ...this.policies[index],
      ...policy,
      updatedAt: new Date(),
    };
    return this.policies[index];
  }

  async softDelete(id: string): Promise<boolean> {
    const index = this.policies.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.policies[index] = { ...this.policies[index], isActive: false, updatedAt: new Date() };
    return true;
  }
}

const makePolicyData = (
  overrides?: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>,
): Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> => ({
  policyName: 'Annual Leave Policy',
  leaveType: LeaveType.ANNUAL,
  entitlementDays: 20,
  accrualRate: 1.67,
  maxAccumulation: 30,
  minimumNoticeDays: 7,
  requiresManagerApproval: true,
  isActive: true,
  ...overrides,
});

describe('PolicyService', () => {
  let service: IPolicyService;
  let repo: ILeavePolicyRepository;

  beforeEach(() => {
    repo = new MockLeavePolicyRepository();
    service = new PolicyService(repo);
  });

  describe('getPolicyByLeaveType', () => {
    it('should return policies matching the leave type', async () => {
      await repo.create(makePolicyData({ leaveType: LeaveType.ANNUAL }));
      await repo.create(makePolicyData({ leaveType: LeaveType.SICK, policyName: 'Sick Leave Policy' }));

      const results = await service.getPolicyByLeaveType(LeaveType.SICK);
      expect(results).toHaveLength(1);
      expect(results[0].leaveType).toBe(LeaveType.SICK);
      expect(results[0].policyName).toBe('Sick Leave Policy');
    });

    it('should return empty array when no policy matches the leave type', async () => {
      const results = await service.getPolicyByLeaveType(LeaveType.EMERGENCY);
      expect(results).toEqual([]);
    });
  });

  describe('getPolicyById', () => {
    it('should return the policy when it exists', async () => {
      const created = await repo.create(makePolicyData());
      const found = await service.getPolicyById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when the policy does not exist', async () => {
      const found = await service.getPolicyById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('getAllActivePolicies', () => {
    it('should return only active policies', async () => {
      await repo.create(makePolicyData({ isActive: true }));
      await repo.create(makePolicyData({ isActive: false, policyName: 'Inactive Policy' }));
      await repo.create(makePolicyData({ isActive: true, leaveType: LeaveType.SICK, policyName: 'Sick Leave Policy' }));

      const results = await service.getAllActivePolicies();
      expect(results).toHaveLength(2);
      expect(results.every((p) => p.isActive)).toBe(true);
    });

    it('should return empty array when no active policies exist', async () => {
      await repo.create(makePolicyData({ isActive: false }));
      const results = await service.getAllActivePolicies();
      expect(results).toEqual([]);
    });
  });

  describe('createPolicy', () => {
    it('should create a policy and return it with generated id and timestamps', async () => {
      const input = makePolicyData();
      const result = await service.createPolicy(input);

      expect(result.id).toBeDefined();
      expect(result.policyName).toBe(input.policyName);
      expect(result.leaveType).toBe(input.leaveType);
      expect(result.entitlementDays).toBe(input.entitlementDays);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePolicy', () => {
    it('should update an existing policy and return it', async () => {
      const created = await repo.create(makePolicyData());
      const updated = await service.updatePolicy(created.id, {
        policyName: 'Updated Policy',
        entitlementDays: 25,
      });

      expect(updated).not.toBeNull();
      expect(updated!.policyName).toBe('Updated Policy');
      expect(updated!.entitlementDays).toBe(25);
    });

    it('should return null when the policy does not exist', async () => {
      const updated = await service.updatePolicy('nonexistent', { policyName: 'Nope' });
      expect(updated).toBeNull();
    });
  });

  describe('deactivatePolicy', () => {
    it('should deactivate an existing policy and return true', async () => {
      const created = await repo.create(makePolicyData({ isActive: true }));
      const result = await service.deactivatePolicy(created.id);

      expect(result).toBe(true);
      const found = await repo.findById(created.id);
      expect(found!.isActive).toBe(false);
    });

    it('should return false when the policy does not exist', async () => {
      const result = await service.deactivatePolicy('nonexistent');
      expect(result).toBe(false);
    });
  });
});
