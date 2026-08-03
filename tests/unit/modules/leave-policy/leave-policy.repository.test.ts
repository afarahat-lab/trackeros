import { Pool } from 'pg';
import { LeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

const mockLeavePolicyRow: Record<string, unknown> = {
  id: 'lp-001',
  policy_name: 'Annual Leave Policy',
  leave_type_id: 'lt-001',
  entitlement_days: 20,
  accrual_rate: 1.67,
  max_accumulation: 30,
  minimum_notice_days: 7,
  requires_manager_approval: true,
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-06-01T00:00:00.000Z',
};

const mockInactiveLeavePolicyRow: Record<string, unknown> = {
  id: 'lp-002',
  policy_name: 'Sick Leave Policy',
  leave_type_id: 'lt-002',
  entitlement_days: 10,
  accrual_rate: null,
  max_accumulation: null,
  minimum_notice_days: null,
  requires_manager_approval: false,
  is_active: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-03-01T00:00:00.000Z',
};

function expectLeavePolicyMatchesRow(leavePolicy: LeavePolicy, row: Record<string, unknown>): void {
  expect(leavePolicy.id).toBe(row.id);
  expect(leavePolicy.policyName).toBe(row.policy_name);
  expect(leavePolicy.leaveTypeId).toBe(row.leave_type_id);
  expect(leavePolicy.entitlementDays).toBe(row.entitlement_days);
  expect(leavePolicy.accrualRate).toBe((row.accrual_rate as number | null) ?? undefined);
  expect(leavePolicy.maxAccumulation).toBe((row.max_accumulation as number | null) ?? undefined);
  expect(leavePolicy.minimumNoticeDays).toBe((row.minimum_notice_days as number | null) ?? undefined);
  expect(leavePolicy.requiresManagerApproval).toBe(row.requires_manager_approval);
  expect(leavePolicy.isActive).toBe(row.is_active);
  expect(leavePolicy.createdAt).toEqual(new Date(row.created_at as string));
  expect(leavePolicy.updatedAt).toEqual(new Date(row.updated_at as string));
}

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repository = new LeavePolicyRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a LeavePolicy when a row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicyRow] });

      const result = await repository.findById('lp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['lp-001'],
      );
      expect(result).not.toBeNull();
      expectLeavePolicyMatchesRow(result!, mockLeavePolicyRow);
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findById("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findById('lp-001')).rejects.toThrow(
        'Failed to find leave policy by id: connection refused',
      );
    });
  });

  describe('findByLeaveTypeId', () => {
    it('should return LeavePolicies when rows match the given leaveTypeId', async () => {
      const mockSecondRow: Record<string, unknown> = {
        id: 'lp-003',
        policy_name: 'Emergency Leave Policy',
        leave_type_id: 'lt-001',
        entitlement_days: 5,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 0,
        requires_manager_approval: true,
        is_active: true,
        created_at: '2024-02-01T00:00:00.000Z',
        updated_at: '2024-05-01T00:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicyRow, mockSecondRow] });

      const result = await repository.findByLeaveTypeId('lt-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1',
        ['lt-001'],
      );
      expect(result).toHaveLength(2);
      expectLeavePolicyMatchesRow(result[0], mockLeavePolicyRow);
      expectLeavePolicyMatchesRow(result[1], mockSecondRow);
    });

    it('should return an empty array when no rows match the given leaveTypeId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByLeaveTypeId('nonexistent');

      expect(result).toEqual([]);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByLeaveTypeId("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByLeaveTypeId('lt-001')).rejects.toThrow(
        'Failed to find leave policies by leave type id: connection refused',
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active leave policies when rows exist', async () => {
      const mockSecondRow: Record<string, unknown> = {
        id: 'lp-003',
        policy_name: 'Emergency Leave Policy',
        leave_type_id: 'lt-003',
        entitlement_days: 5,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 0,
        requires_manager_approval: true,
        is_active: true,
        created_at: '2024-02-01T00:00:00.000Z',
        updated_at: '2024-05-01T00:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicyRow, mockSecondRow] });

      const result = await repository.findAllActive();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
      expect(result).toHaveLength(2);
      expectLeavePolicyMatchesRow(result[0], mockLeavePolicyRow);
      expectLeavePolicyMatchesRow(result[1], mockSecondRow);
    });

    it('should return an empty array when no active rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAllActive();

      expect(result).toEqual([]);
    });

    it('should not return inactive leave policies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicyRow] });

      const result = await repository.findAllActive();

      expect(result).toHaveLength(1);
      result.forEach((lp) => {
        expect(lp.isActive).toBe(true);
      });
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findAllActive()).rejects.toThrow(
        'Failed to find all active leave policies: connection refused',
      );
    });
  });

  describe('nullable fields', () => {
    it('should preserve undefined for accrualRate, maxAccumulation, and minimumNoticeDays when row has null values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeavePolicyRow] });

      const result = await repository.findById('lp-002');

      expect(result).not.toBeNull();
      expect(result!.accrualRate).toBeUndefined();
      expect(result!.maxAccumulation).toBeUndefined();
      expect(result!.minimumNoticeDays).toBeUndefined();
    });

    it('should preserve numeric values for accrualRate, maxAccumulation, and minimumNoticeDays when row has values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicyRow] });

      const result = await repository.findById('lp-001');

      expect(result).not.toBeNull();
      expect(result!.accrualRate).toBe(1.67);
      expect(result!.maxAccumulation).toBe(30);
      expect(result!.minimumNoticeDays).toBe(7);
    });
  });

  describe('isActive filtering', () => {
    it('should return a leave policy via findById regardless of active state', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeavePolicyRow] });

      const result = await repository.findById('lp-002');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });

    it('should return leave policies via findByLeaveTypeId regardless of active state', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeavePolicyRow] });

      const result = await repository.findByLeaveTypeId('lt-002');

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });
  });
});
