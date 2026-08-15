import { PolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { Pool, PoolClient } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

function makePolicyRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'pol-1',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: 20,
    max_accumulation: 20,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function expectedPolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: 'annual',
    entitlementDays: 20,
    accrualRate: 20,
    maxAccumulation: 20,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PolicyRepository', () => {
  let repo: PolicyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PolicyRepository();
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      const row = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-1');

      expect(result).toEqual(expectedPolicy());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found for the given leave type', async () => {
      const row = makePolicyRow({ leave_type: 'sick' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType('sick');

      expect(result).toEqual(expectedPolicy({ leaveType: 'sick' }));
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        ['sick'],
      );
    });

    it('should return null when no policy exists for the leave type', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType('maternity');

      expect(result).toBeNull();
    });
  });

  describe('findAllActive', () => {
    it('should return all active policies ordered by policy_name', async () => {
      const row1 = makePolicyRow();
      const row2 = makePolicyRow({ id: 'pol-2', policy_name: 'Sick Leave', leave_type: 'sick' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedPolicy());
      expect(result[1]).toEqual(
        expectedPolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: 'sick' }),
      );
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true ORDER BY policy_name',
      );
    });

    it('should return empty array when no active policies exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new policy', async () => {
      const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        policyName: 'Annual Leave',
        leaveType: 'annual',
        entitlementDays: 20,
        accrualRate: 20,
        maxAccumulation: 20,
        minimumNoticeDays: 7,
        requiresManagerApproval: true,
        isActive: true,
      };

      const row = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(expectedPolicy());
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql: string = (pool.query as jest.Mock).mock.calls[0][0];
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(sql).toContain('INSERT INTO leave_policies');
      expect(params[0]).toBe('Annual Leave');
      expect(params[1]).toBe('annual');
      expect(params[2]).toBe(20);
      expect(params[3]).toBe(20);
      expect(params[4]).toBe(20);
      expect(params[5]).toBe(7);
      expect(params[6]).toBe(true);
      expect(params[7]).toBe(true);
    });

    it('should handle null accrualRate, maxAccumulation, and minimumNoticeDays', async () => {
      const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        policyName: 'Emergency Leave',
        leaveType: 'emergency',
        entitlementDays: 5,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: null,
        requiresManagerApproval: true,
        isActive: true,
      };

      const row = makePolicyRow({
        policy_name: 'Emergency Leave',
        leave_type: 'emergency',
        entitlement_days: 5,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: null,
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result.accrualRate).toBeNull();
      expect(result.maxAccumulation).toBeNull();
      expect(result.minimumNoticeDays).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the policy', async () => {
      const existingRow = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makePolicyRow({ policy_name: 'Updated Annual', updated_at: '2023-07-01T00:00:00.000Z' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('pol-1', { policyName: 'Updated Annual' });

      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Annual');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when policy does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should return existing policy when no fields to update', async () => {
      const existingRow = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('pol-1', {});

      expect(result).toEqual(expectedPolicy());
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should not allow changing leaveType via update', async () => {
      const existingRow = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('pol-1', { leaveType: 'sick' } as Partial<LeavePolicy>);

      // leaveType is not in the fieldMap, so it should be ignored and the existing row returned unchanged
      expect(result).not.toBeNull();
      expect(result!.leaveType).toBe('annual');
      // Only findById was called; no UPDATE query since no updatable fields
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should update isActive to false for inactivation', async () => {
      const existingRow = makePolicyRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makePolicyRow({ is_active: false, updated_at: '2023-07-01T00:00:00.000Z' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('pol-1', { isActive: false });

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided PoolClient instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as PoolClient;
      const clientRepo = new PolicyRepository(mockClient);

      const row = makePolicyRow();
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [row] });

      const result = await clientRepo.findById('pol-1');

      expect(result).toEqual(expectedPolicy());
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
