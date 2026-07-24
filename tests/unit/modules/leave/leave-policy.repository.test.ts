
import { Pool } from 'pg';
import { LeavePolicyRepository } from '../../../../src/modules/leave/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types/index';

describe('LeavePolicyRepository', () => {
  let mockQuery: jest.Mock;
  let mockPool: Pool;
  let repo: LeavePolicyRepository;

  const makePolicy = (overrides: Partial<LeavePolicy> = {}): LeavePolicy => ({
    id: 'policy-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.Annual,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    allowsNegativeBalance: false,
    maxConsecutiveDays: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = { query: mockQuery } as unknown as Pool;
    repo = new LeavePolicyRepository(mockPool);
  });

  describe('constructor', () => {
    it('should use the provided pool', () => {
      expect(repo['pool']).toBe(mockPool);
    });
  });

  describe('findById', () => {
    it('should return policy when found', async () => {
      const policy = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [policy], rowCount: 1 });

      const result = await repo.findById('policy-1');

      expect(result).toEqual(policy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policy WHERE id = $1 AND deleted_at IS NULL',
        ['policy-1'],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted policies ordered by name', async () => {
      const policies = [makePolicy(), makePolicy({ id: 'policy-2', policyName: 'Sick Leave', leaveType: LeaveType.Sick })];
      mockQuery.mockResolvedValueOnce({ rows: policies, rowCount: 2 });

      const result = await repo.findAll();

      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policy WHERE deleted_at IS NULL ORDER BY policy_name ASC',
      );
    });

    it('should return empty array when no policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies matching the leave type', async () => {
      const policies = [makePolicy()];
      mockQuery.mockResolvedValueOnce({ rows: policies, rowCount: 1 });

      const result = await repo.findByLeaveType(LeaveType.Annual);

      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policy WHERE leave_type = $1 AND deleted_at IS NULL ORDER BY policy_name ASC',
        [LeaveType.Annual],
      );
    });

    it('should return empty array when no policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByLeaveType(LeaveType.Emergency);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return the new policy', async () => {
      const input = {
        policyName: 'Emergency Leave',
        leaveType: LeaveType.Emergency,
        entitlementDays: 5,
        accrualRate: 0,
        maxAccumulation: 5,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
        allowsNegativeBalance: false,
        maxConsecutiveDays: 3,
      };
      const created = makePolicy({ id: 'policy-3', ...input });
      mockQuery.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

      const result = await repo.create(input);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_policy (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, allows_negative_balance, max_consecutive_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
        [
          input.policyName,
          input.leaveType,
          input.entitlementDays,
          input.accrualRate,
          input.maxAccumulation,
          input.minimumNoticeDays,
          input.requiresManagerApproval,
          input.isActive,
          input.allowsNegativeBalance,
          input.maxConsecutiveDays,
        ],
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated policy', async () => {
      const updated = makePolicy({ policyName: 'Updated Annual Leave', entitlementDays: 25 });
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const result = await repo.update('policy-1', {
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
      });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policy SET policy_name = $1, entitlement_days = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL RETURNING *',
        ['Updated Annual Leave', 25, 'policy-1'],
      );
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { isActive: false });

      expect(result).toBeNull();
    });

    it('should return existing policy when no fields are provided', async () => {
      const existing = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await repo.update('policy-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policy WHERE id = $1 AND deleted_at IS NULL',
        ['policy-1'],
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete the policy and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete('policy-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policy SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        ['policy-1'],
      );
    });

    it('should return false when policy does not exist or already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
