import { PgLeaveBalanceRepository } from 'modules/leave-balance';
import { LeaveBalance } from 'modules/leave-balance';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'lb-001',
    employeeId: 'emp-001',
    policyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2025,
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeRow(balance: LeaveBalance): Record<string, unknown> {
  return {
    id: balance.id,
    employee_id: balance.employeeId,
    policy_id: balance.policyId,
    total_entitlement: balance.totalEntitlement,
    used_days: balance.usedDays,
    remaining_days: balance.remainingDays,
    fiscal_year: balance.fiscalYear,
    status: balance.status,
    created_at: balance.createdAt,
    updated_at: balance.updatedAt,
  };
}

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;

  beforeEach(() => {
    repo = new PgLeaveBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.findById('lb-001');

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['lb-001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return balances for a given employee', async () => {
      const balance1 = makeBalance({ id: 'lb-001' });
      const balance2 = makeBalance({ id: 'lb-002', policyId: 'lp-002', fiscalYear: 2026 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance1), makeRow(balance2)] });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(2);
      expect(result).toEqual([balance1, balance2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1',
        ['emp-001']
      );
    });

    it('should return empty array when no balances found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return the balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'lp-001');

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2',
        ['emp-001', 'lp-001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'lp-999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('should return balances for employee in a fiscal year', async () => {
      const balance1 = makeBalance({ id: 'lb-001', fiscalYear: 2025 });
      const balance2 = makeBalance({ id: 'lb-002', policyId: 'lp-002', fiscalYear: 2025 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance1), makeRow(balance2)] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2025);

      expect(result).toHaveLength(2);
      expect(result).toEqual([balance1, balance2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-001', 2025]
      );
    });

    it('should return empty array when no balances found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2020);

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should insert and return the balance', async () => {
      const balance = makeBalance();
      // findExisting returns empty — no duplicate
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // INSERT
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.save(balance);

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3',
        [balance.employeeId, balance.policyId, balance.fiscalYear]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO leave_balances'),
        [
          balance.id,
          balance.employeeId,
          balance.policyId,
          balance.totalEntitlement,
          balance.usedDays,
          balance.remainingDays,
          balance.fiscalYear,
          balance.status,
          balance.createdAt,
          balance.updatedAt,
        ]
      );
    });

    it('should reject duplicate (employeeId, policyId, fiscalYear)', async () => {
      const balance = makeBalance();
      // findExisting returns a row — duplicate exists
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      await expect(repo.save(balance)).rejects.toThrow(
        `Duplicate leave balance: employee ${balance.employeeId} already has a balance for policy ${balance.policyId} in fiscal year ${balance.fiscalYear}`
      );
    });
  });

  describe('update', () => {
    it('should update and return the balance when found', async () => {
      const existing = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeBalance({ totalEntitlement: 25, remainingDays: 20, usedDays: 5 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lb-001', { totalEntitlement: 25 });

      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(25);
      expect(result!.remainingDays).toBe(20);
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { totalEntitlement: 30 });

      expect(result).toBeNull();
    });

    it('should set updatedAt to current time on update', async () => {
      const existing = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const beforeUpdate = new Date();
      const updated = makeBalance({ totalEntitlement: 30, updatedAt: beforeUpdate });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lb-001', { totalEntitlement: 30 });

      expect(result!.updatedAt).toBeDefined();
    });
  });

  describe('incrementUsedDays', () => {
    it('should atomically increment used_days and recompute remaining_days', async () => {
      const existing = makeBalance({ usedDays: 5, remainingDays: 15, totalEntitlement: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeBalance({ usedDays: 8, remainingDays: 12, totalEntitlement: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // atomic update

      const result = await repo.incrementUsedDays('lb-001', 3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        `UPDATE leave_balances SET
        used_days = used_days + $2,
        remaining_days = total_entitlement - (used_days + $2),
        updated_at = NOW()
       WHERE id = $1 AND (used_days + $2) <= total_entitlement
       RETURNING *`,
        ['lb-001', 3]
      );
    });

    it('should support negative delta for restoration', async () => {
      const existing = makeBalance({ usedDays: 8, remainingDays: 12, totalEntitlement: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeBalance({ usedDays: 5, remainingDays: 15, totalEntitlement: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // atomic update

      const result = await repo.incrementUsedDays('lb-001', -3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
    });

    it('should throw when increment would exceed totalEntitlement', async () => {
      const existing = makeBalance({ usedDays: 18, remainingDays: 2, totalEntitlement: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById
      // The WHERE clause prevents the update, so no rows returned
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repo.incrementUsedDays('lb-001', 5)).rejects.toThrow(
        'Increment of 5 day(s) would exceed total entitlement of 20 for balance lb-001'
      );
    });

    it('should return null when balance id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.incrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });
  });
});
