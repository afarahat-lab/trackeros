import { LeavePolicy, LeavePolicyQueryParams } from '../../../../src/modules/policy/policy.model';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
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

describe('ILeavePolicyRepository', () => {
  let repo: ILeavePolicyRepository;

  beforeEach(() => {
    repo = new MockLeavePolicyRepository();
  });

  describe('create', () => {
    it('should create a policy and return it with generated id and timestamps', async () => {
      const input = makePolicyData();
      const result = await repo.create(input);

      expect(result.id).toBeDefined();
      expect(result.policyName).toBe(input.policyName);
      expect(result.leaveType).toBe(input.leaveType);
      expect(result.entitlementDays).toBe(input.entitlementDays);
      expect(result.accrualRate).toBe(input.accrualRate);
      expect(result.maxAccumulation).toBe(input.maxAccumulation);
      expect(result.minimumNoticeDays).toBe(input.minimumNoticeDays);
      expect(result.requiresManagerApproval).toBe(input.requiresManagerApproval);
      expect(result.isActive).toBe(input.isActive);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should return the policy when it exists', async () => {
      const created = await repo.create(makePolicyData());
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when the policy does not exist', async () => {
      const found = await repo.findById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies matching the leave type', async () => {
      await repo.create(makePolicyData({ leaveType: LeaveType.ANNUAL }));
      await repo.create(makePolicyData({ leaveType: LeaveType.SICK, policyName: 'Sick Leave Policy' }));

      const results = await repo.findByLeaveType(LeaveType.SICK);
      expect(results).toHaveLength(1);
      expect(results[0].leaveType).toBe(LeaveType.SICK);
      expect(results[0].policyName).toBe('Sick Leave Policy');
    });

    it('should return empty array when no policy matches the leave type', async () => {
      const results = await repo.findByLeaveType(LeaveType.EMERGENCY);
      expect(results).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all policies when no params are given', async () => {
      await repo.create(makePolicyData());
      await repo.create(makePolicyData({ leaveType: LeaveType.SICK, policyName: 'Sick Leave Policy' }));

      const results = await repo.findAll();
      expect(results.length).toBe(2);
    });

    it('should filter by leaveType', async () => {
      await repo.create(makePolicyData({ leaveType: LeaveType.ANNUAL }));
      await repo.create(makePolicyData({ leaveType: LeaveType.SICK, policyName: 'Sick Leave Policy' }));

      const results = await repo.findAll({ leaveType: LeaveType.ANNUAL });
      expect(results.length).toBe(1);
      expect(results[0].leaveType).toBe(LeaveType.ANNUAL);
    });

    it('should filter by isActive', async () => {
      await repo.create(makePolicyData({ isActive: true }));
      await repo.create(makePolicyData({ isActive: false, policyName: 'Inactive Policy' }));

      const results = await repo.findAll({ isActive: false });
      expect(results.length).toBe(1);
      expect(results[0].isActive).toBe(false);
    });

    it('should return empty array when no policies exist', async () => {
      const results = await repo.findAll();
      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an existing policy and return it', async () => {
      const created = await repo.create(makePolicyData());
      const updated = await repo.update(created.id, { policyName: 'Updated Policy', entitlementDays: 25 });

      expect(updated).not.toBeNull();
      expect(updated!.policyName).toBe('Updated Policy');
      expect(updated!.entitlementDays).toBe(25);
      expect(updated!.leaveType).toBe(created.leaveType);
    });

    it('should return null when the policy does not exist', async () => {
      const updated = await repo.update('nonexistent', { policyName: 'Nope' });
      expect(updated).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false on an existing policy', async () => {
      const created = await repo.create(makePolicyData({ isActive: true }));
      const result = await repo.softDelete(created.id);

      expect(result).toBe(true);
      const found = await repo.findById(created.id);
      expect(found!.isActive).toBe(false);
    });

    it('should return false when the policy does not exist', async () => {
      const result = await repo.softDelete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
