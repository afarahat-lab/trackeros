import { PolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeaveType } from '../../../../src/shared/types';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    policy_name: 'Annual Leave',
    leave_type: 'ANNUAL',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('PolicyRepository', () => {
  let repo: PolicyRepository;

  beforeEach(() => {
    repo = new PolicyRepository();
    mockQuery.mockReset();
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.leaveType).toBe(LeaveType.ANNUAL);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1 AND is_active = true',
        ['ANNUAL']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      const row = makeRow({ id: 42 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById(42);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(42);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      const rows = [makeRow({ id: 1 }), makeRow({ id: 2, policy_name: 'Sick Leave', leave_type: 'SICK' })];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return empty array when no policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return the new policy', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const dto = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.ANNUAL,
        entitlementDays: 20,
        requiresManagerApproval: true,
        isActive: true,
      };

      const result = await repo.create(dto);

      expect(result.id).toBe(1);
      expect(result.policyName).toBe('Annual Leave');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update and return the policy', async () => {
      const row = makeRow({ policy_name: 'Updated Policy', entitlement_days: 25 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update(1, { policyName: 'Updated Policy', entitlementDays: 25 });

      expect(result).not.toBeNull();
      expect(result?.policyName).toBe('Updated Policy');
      expect(result?.entitlementDays).toBe(25);
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update(999, { policyName: 'Nope' });

      expect(result).toBeNull();
    });

    it('should return existing policy when dto is empty', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update(1, {});

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDelete', () => {
    it('should return true when a row was updated', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policies SET is_active = false, updated_at = NOW() WHERE id = $1',
        [1]
      );
    });

    it('should return false when no row was updated', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete(999);

      expect(result).toBe(false);
    });
  });
});
