import { PgLeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeLeavePolicyRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'policy-001',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  const now = new Date();
  return {
    id: 'policy-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgLeavePolicyRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave policy when found', async () => {
      const row = makeLeavePolicyRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('policy-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['policy-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('policy-001');
      expect(result!.policyName).toBe('Annual Leave');
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.entitlementDays).toBe(20);
      expect(result!.accrualRate).toBeUndefined();
      expect(result!.maxAccumulation).toBeUndefined();
      expect(result!.minimumNoticeDays).toBe(7);
      expect(result!.requiresManagerApproval).toBe(true);
      expect(result!.isActive).toBe(true);
    });

    it('should return null when policy is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, policy_name: 'Test' }], rowCount: 1 });

      const result = await repo.findById('policy-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('policy-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByLeaveType', () => {
    it('should return the active policy for a given leave type', async () => {
      const row = makeLeavePolicyRow({ leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1 AND is_active = true LIMIT 1',
        ['sick']
      );
      expect(result).not.toBeNull();
      expect(result!.leaveType).toBe(LeaveType.SICK);
    });

    it('should return null when no active policy exists for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByLeaveType(LeaveType.EMERGENCY);

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByLeaveType(LeaveType.ANNUAL)).rejects.toThrow('query failed');
    });
  });

  describe('findAllActive', () => {
    it('should return all active leave policies', async () => {
      const row1 = makeLeavePolicyRow({ id: 'policy-001' });
      const row2 = makeLeavePolicyRow({ id: 'policy-002', leave_type: 'sick', policy_name: 'Sick Leave' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findAllActive();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
        undefined
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('policy-001');
      expect(result[1].id).toBe('policy-002');
    });

    it('should return an empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeavePolicyRow({ id: 'policy-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findAllActive();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('policy-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findAllActive()).rejects.toThrow('query failed');
    });
  });

  describe('create', () => {
    it('should create a leave policy and return it', async () => {
      const input = {
        policyName: 'Maternity Leave',
        leaveType: LeaveType.MATERNITY,
        entitlementDays: 90,
        accrualRate: undefined,
        maxAccumulation: undefined,
        minimumNoticeDays: 30,
        requiresManagerApproval: true,
        isActive: true,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeavePolicyRow({
          id: 'generated-id',
          policy_name: 'Maternity Leave',
          leave_type: 'maternity',
          entitlement_days: 90,
          minimum_notice_days: 30,
        })],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO leave_policies');
      expect(queryText).toContain('RETURNING *');
      expect(result.policyName).toBe('Maternity Leave');
      expect(result.leaveType).toBe(LeaveType.MATERNITY);
      expect(result.entitlementDays).toBe(90);
      expect(result.minimumNoticeDays).toBe(30);
      expect(result.requiresManagerApproval).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          policyName: 'Test',
          leaveType: LeaveType.UNPAID,
          entitlementDays: 0,
          accrualRate: undefined,
          maxAccumulation: undefined,
          minimumNoticeDays: undefined,
          requiresManagerApproval: false,
          isActive: true,
        })
      ).rejects.toThrow('Failed to create leave policy');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          policyName: 'Test',
          leaveType: LeaveType.UNPAID,
          entitlementDays: 0,
          accrualRate: undefined,
          maxAccumulation: undefined,
          minimumNoticeDays: undefined,
          requiresManagerApproval: false,
          isActive: true,
        })
      ).rejects.toThrow('Failed to create leave policy');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(
        repo.create({
          policyName: 'Test',
          leaveType: LeaveType.ANNUAL,
          entitlementDays: 20,
          accrualRate: undefined,
          maxAccumulation: undefined,
          minimumNoticeDays: undefined,
          requiresManagerApproval: true,
          isActive: true,
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('update', () => {
    it('should update a leave policy and return the updated record', async () => {
      const updatedRow = makeLeavePolicyRow({
        policy_name: 'Updated Annual Leave',
        entitlement_days: 25,
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('policy-001', {
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('UPDATE leave_policies SET');
      expect(queryText).toContain('policy_name = $1');
      expect(queryText).toContain('entitlement_days = $2');
      expect(queryText).toContain('updated_at = $3');
      expect(queryText).toContain('WHERE id = $4');
      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Annual Leave');
      expect(result!.entitlementDays).toBe(25);
    });

    it('should return null when policy is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { policyName: 'X' });

      expect(result).toBeNull();
    });

    it('should return current policy when no fields are provided', async () => {
      const row = makeLeavePolicyRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.update('policy-001', {});

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM leave_policies WHERE id = $1');
      expect(result).not.toBeNull();
    });

    it('should handle null accrualRate and maxAccumulation', async () => {
      const updatedRow = makeLeavePolicyRow({ accrual_rate: null, max_accumulation: null });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('policy-001', {
        accrualRate: undefined,
        maxAccumulation: undefined,
      });

      expect(result).not.toBeNull();
      expect(result!.accrualRate).toBeUndefined();
      expect(result!.maxAccumulation).toBeUndefined();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.update('policy-001', { policyName: 'X' })
      ).rejects.toThrow('update failed');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a leave policy and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.deactivate('policy-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policies SET is_active = $1, updated_at = $2 WHERE id = $3',
        [false, expect.any(Date), 'policy-001']
      );
      expect(result).toBe(true);
    });

    it('should return false when policy is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.deactivate('nonexistent');

      expect(result).toBe(false);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('deactivate failed'));

      await expect(repo.deactivate('policy-001')).rejects.toThrow('deactivate failed');
    });
  });
});
