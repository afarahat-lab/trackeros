import { PgLeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import type { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { LeaveType } from '../../../../src/shared/types/enums';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'pol-001',
    policy_name: overrides.policy_name ?? 'Annual Leave',
    leave_type: overrides.leave_type ?? 'ANNUAL',
    entitlement_days: overrides.entitlement_days ?? 20,
    accrual_rate: overrides.accrual_rate ?? null,
    max_accumulation: overrides.max_accumulation ?? null,
    minimum_notice_days: overrides.minimum_notice_days ?? 7,
    requires_manager_approval: overrides.requires_manager_approval ?? true,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? new Date('2024-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2024-06-01T00:00:00Z'),
  };
}

function makeEntity(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;

  beforeEach(() => {
    repo = new PgLeavePolicyRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a LeavePolicy when a row matches', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findById('pol-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('pol-001');
      expect(result!.policyName).toBe('Annual Leave');
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.entitlementDays).toBe(20);
      expect(result!.accrualRate).toBeNull();
      expect(result!.maxAccumulation).toBeNull();
      expect(result!.minimumNoticeDays).toBe(7);
      expect(result!.requiresManagerApproval).toBe(true);
      expect(result!.isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-001'],
      );
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.findById('pol-001')).rejects.toThrow('Connection refused');
    });
  });

  describe('findByLeaveType', () => {
    it('should return a LeavePolicy when a row matches the leave type', async () => {
      const row = makeRow({ leave_type: 'SICK' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(result).not.toBeNull();
      expect(result!.leaveType).toBe(LeaveType.SICK);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.SICK],
      );
    });

    it('should return null when no row matches the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByLeaveType(LeaveType.EMERGENCY);

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByLeaveType(LeaveType.ANNUAL)).rejects.toThrow('Query timeout');
    });
  });

  describe('findActive', () => {
    it('should return an array of active policies', async () => {
      const row1 = makeRow({ id: 'pol-001' });
      const row2 = makeRow({ id: 'pol-002', leave_type: 'SICK' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findActive();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pol-001');
      expect(result[1].id).toBe('pol-002');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = $1',
        [true],
      );
    });

    it('should return an empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findActive();

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findActive()).rejects.toThrow('Query timeout');
    });
  });

  describe('create', () => {
    const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      policyName: 'Sick Leave',
      leaveType: LeaveType.SICK,
      entitlementDays: 10,
      accrualRate: 0.83,
      maxAccumulation: 30,
      minimumNoticeDays: 1,
      requiresManagerApproval: false,
      isActive: true,
    };

    it('should insert and return a fully-populated LeavePolicy', async () => {
      const returnedRow = makeRow({
        id: 'generated-id',
        policy_name: 'Sick Leave',
        leave_type: 'SICK',
        entitlement_days: 10,
        accrual_rate: 0.83,
        max_accumulation: 30,
        minimum_notice_days: 1,
        requires_manager_approval: false,
        is_active: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.policyName).toBe('Sick Leave');
      expect(result.leaveType).toBe(LeaveType.SICK);
      expect(result.entitlementDays).toBe(10);
      expect(result.accrualRate).toBe(0.83);
      expect(result.maxAccumulation).toBe(30);
      expect(result.minimumNoticeDays).toBe(1);
      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO leave_policies');
      expect(queryCall[1][1]).toBe('Sick Leave');
      expect(queryCall[1][2]).toBe(LeaveType.SICK);
      expect(queryCall[1][3]).toBe(10);
      expect(queryCall[1][4]).toBe(0.83);
      expect(queryCall[1][5]).toBe(30);
      expect(queryCall[1][6]).toBe(1);
      expect(queryCall[1][7]).toBe(false);
      expect(queryCall[1][8]).toBe(true);
    });

    it('should reject on a unique-constraint violation (duplicate leaveType)', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });

    it('should reject on a query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('update', () => {
    it('should apply a partial update and return the updated LeavePolicy', async () => {
      const existingRow = makeRow({ id: 'pol-001' });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);

      const updatedRow = makeRow({
        id: 'pol-001',
        policy_name: 'Updated Annual Leave',
        entitlement_days: 25,
        updated_at: new Date('2024-07-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 } as never);

      const result = await repo.update('pol-001', {
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
      });

      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Annual Leave');
      expect(result!.entitlementDays).toBe(25);
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.update('nonexistent', { policyName: 'X' });

      expect(result).toBeNull();
    });

    it('should reject on a query error during findById', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.update('pol-001', { policyName: 'X' })).rejects.toThrow('Connection refused');
    });

    it('should reject on a query error during the update query', async () => {
      const existingRow = makeRow({ id: 'pol-001' });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      await expect(repo.update('pol-001', { policyName: 'X' })).rejects.toThrow('Update failed');
    });
  });
});
