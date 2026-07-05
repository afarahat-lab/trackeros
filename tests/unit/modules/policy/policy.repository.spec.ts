
import { Pool } from 'pg';
import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeaveType } from '../../../../src/shared/types/leave.types';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

const makePolicy = (overrides: Partial<LeavePolicy> = {}): LeavePolicy => ({
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
  ...overrides,
});

describe('LeavePolicyRepository', () => {
  let repo: LeavePolicyRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repo = new LeavePolicyRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      const policy = makePolicy();
      mockQuery.mockResolvedValueOnce({ rows: [policy] });

      const result = await repo.findById(1);
      expect(result).toEqual(policy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        [1]
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies for a given leave type', async () => {
      const policies = [makePolicy(), makePolicy({ id: 2, leaveType: LeaveType.ANNUAL })];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);
      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.ANNUAL]
      );
    });

    it('should return empty array when no policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.MATERNITY);
      expect(result).toEqual([]);
    });
  });

  describe('findActivePolicies', () => {
    it('should return active policies with no filters', async () => {
      const policies = [makePolicy()];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repo.findActivePolicies();
      expect(result).toEqual(policies);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
        []
      );
    });

    it('should filter by leaveType', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findActivePolicies({ leaveType: LeaveType.SICK });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true AND leave_type = $1',
        [LeaveType.SICK]
      );
    });

    it('should filter by fiscalYear', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findActivePolicies({ fiscalYear: 2026 });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true AND fiscal_year = $1',
        [2026]
      );
    });

    it('should filter by both leaveType and fiscalYear', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findActivePolicies({ leaveType: LeaveType.ANNUAL, fiscalYear: 2026 });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true AND leave_type = $1 AND fiscal_year = $2',
        [LeaveType.ANNUAL, 2026]
      );
    });
  });

  describe('create', () => {
    it('should insert and return a new policy', async () => {
      const input = {
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: 0.83,
        maxAccumulation: 15,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
        isActive: true,
        allowNegativeBalance: false,
        maxConsecutiveDays: 5,
        fiscalYear: 2026,
      };
      const created = makePolicy({ id: 2, ...input });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [
          'Sick Leave',
          LeaveType.SICK,
          10,
          0.83,
          15,
          1,
          false,
          true,
          false,
          5,
          2026,
        ]
      );
    });
  });

  describe('update', () => {
    it('should update and return the policy', async () => {
      const updated = makePolicy({ policyName: 'Updated Policy' });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update(1, { policyName: 'Updated Policy' });
      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        ['Updated Policy', 1]
      );
    });

    it('should return null when no fields to update', async () => {
      const result = await repo.update(1, {});
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return null when policy not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update(999, { policyName: 'Ghost' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete(1);
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM leave_policies WHERE id = $1',
        [1]
      );
    });

    it('should return false when no row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete(999);
      expect(result).toBe(false);
    });
  });
});
