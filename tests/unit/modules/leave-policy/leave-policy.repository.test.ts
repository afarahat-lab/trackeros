import { PgLeavePolicyRepository } from 'modules/leave-policy';
import { LeavePolicy } from 'modules/leave-policy';
import { LeaveType } from 'shared/types';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
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
    ...overrides,
  };
}

function makeRow(policy: LeavePolicy): Record<string, unknown> {
  return {
    id: policy.id,
    policy_name: policy.policyName,
    leave_type: policy.leaveType,
    entitlement_days: policy.entitlementDays,
    accrual_rate: policy.accrualRate,
    max_accumulation: policy.maxAccumulation,
    minimum_notice_days: policy.minimumNoticeDays,
    requires_manager_approval: policy.requiresManagerApproval,
    is_active: policy.isActive,
    created_at: policy.createdAt,
    updated_at: policy.updatedAt,
  };
}

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;

  beforeEach(() => {
    repo = new PgLeavePolicyRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      const policy = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy)] });

      const result = await repo.findById('lp-001');

      expect(result).toEqual(policy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['lp-001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies for a given leave type', async () => {
      const policy1 = makePolicy({ id: 'lp-001' });
      const policy2 = makePolicy({ id: 'lp-002', policyName: 'Sick Leave' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy1), makeRow(policy2)] });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(result).toHaveLength(2);
      expect(result).toEqual([policy1, policy2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.ANNUAL]
      );
    });

    it('should return empty array when no policies found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return only active policies', async () => {
      const policy1 = makePolicy({ id: 'lp-001', isActive: true });
      const policy2 = makePolicy({ id: 'lp-002', policyName: 'Sick Leave', isActive: true });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy1), makeRow(policy2)] });

      const result = await repo.findActive();

      expect(result).toHaveLength(2);
      expect(result).toEqual([policy1, policy2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true'
      );
    });

    it('should return empty array when no active policies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findActive();

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all policies regardless of isActive state', async () => {
      const policy1 = makePolicy({ id: 'lp-001', isActive: true });
      const policy2 = makePolicy({ id: 'lp-002', policyName: 'Sick Leave', isActive: false });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy1), makeRow(policy2)] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result).toEqual([policy1, policy2]);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_policies');
    });

    it('should return empty array when no policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should insert and return the policy', async () => {
      const policy = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy)] });

      const result = await repo.save(policy);

      expect(result).toEqual(policy);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [
          policy.id,
          policy.policyName,
          policy.leaveType,
          policy.entitlementDays,
          policy.accrualRate,
          policy.maxAccumulation,
          policy.minimumNoticeDays,
          policy.requiresManagerApproval,
          policy.isActive,
          policy.createdAt,
          policy.updatedAt,
        ]
      );
    });

    it('should preserve null values for nullable fields', async () => {
      const policy = makePolicy({ accrualRate: null, maxAccumulation: null, minimumNoticeDays: null });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(policy)] });

      const result = await repo.save(policy);

      expect(result.accrualRate).toBeNull();
      expect(result.maxAccumulation).toBeNull();
      expect(result.minimumNoticeDays).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the policy when found', async () => {
      const existing = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makePolicy({ policyName: 'Updated Annual Leave', entitlementDays: 25 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lp-001', { policyName: 'Updated Annual Leave', entitlementDays: 25 });

      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Annual Leave');
      expect(result!.entitlementDays).toBe(25);
    });

    it('should return null when policy not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should set updatedAt to current time on update', async () => {
      const existing = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const beforeUpdate = new Date();
      const updated = makePolicy({ policyName: 'Updated', updatedAt: beforeUpdate });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lp-001', { policyName: 'Updated' });

      expect(result!.updatedAt).toBeDefined();
    });
  });
});
