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
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-06-15T12:00:00Z'),
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
      const b1 = makeBalance({ id: 'lb-001' });
      const b2 = makeBalance({ id: 'lb-002', policyId: 'lp-002', fiscalYear: 2027, status: 'FORECAST' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(b1), makeRow(b2)] });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(2);
      expect(result).toEqual([b1, b2]);
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
    it('should return the ACTIVE balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'lp-001');

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND status = 'ACTIVE'",
        ['emp-001', 'lp-001']
      );
    });

    it('should return null when no ACTIVE balance exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'lp-001');

      expect(result).toBeNull();
    });

    it('should not return CLOSED or FORECAST balances', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'lp-001');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('should return balances for a given employee and fiscal year', async () => {
      const b1 = makeBalance({ id: 'lb-001', fiscalYear: 2026 });
      const b2 = makeBalance({ id: 'lb-002', policyId: 'lp-002', fiscalYear: 2026 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(b1), makeRow(b2)] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2026);

      expect(result).toHaveLength(2);
      expect(result).toEqual([b1, b2]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-001', 2026]
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
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.save(balance);

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
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

    it('should save a FORECAST balance with zero usedDays', async () => {
      const balance = makeBalance({ status: 'FORECAST', usedDays: 0, remainingDays: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(balance)] });

      const result = await repo.save(balance);

      expect(result.status).toBe('FORECAST');
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
    });
  });

  describe('update', () => {
    it('should update and return the balance when found', async () => {
      const existing = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeBalance({ usedDays: 8, remainingDays: 12 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lb-001', { usedDays: 8 });

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
    });

    it('should enforce remainingDays = totalEntitlement - usedDays invariant', async () => {
      const existing = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      // Even if caller passes a partial that would break the invariant,
      // the update method recomputes remainingDays
      const recomputed = makeBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(recomputed)] }); // update

      const result = await repo.update('lb-001', { usedDays: 10, remainingDays: 999 });

      expect(result).not.toBeNull();
      expect(result!.remainingDays).toBe(10);
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { usedDays: 5 });

      expect(result).toBeNull();
    });

    it('should set updatedAt to current time on update', async () => {
      const existing = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const beforeUpdate = new Date();
      const updated = makeBalance({ usedDays: 3, remainingDays: 17, updatedAt: beforeUpdate });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('lb-001', { usedDays: 3 });

      expect(result!.updatedAt).toBeDefined();
    });
  });

  describe('incrementUsedDays', () => {
    it('should atomically increment used_days and recompute remaining_days via pool', async () => {
      const afterIncrement = makeBalance({ usedDays: 8, remainingDays: 12 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(afterIncrement)] });

      const result = await repo.incrementUsedDays('lb-001', 3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        ['lb-001', 3]
      );
    });

    it('should support negative days for restoration', async () => {
      const afterRestore = makeBalance({ usedDays: 2, remainingDays: 18 });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(afterRestore)] });

      const result = await repo.incrementUsedDays('lb-001', -3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(2);
      expect(result!.remainingDays).toBe(18);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        ['lb-001', -3]
      );
    });

    it('should return null when the id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.incrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });

    it('should use the provided client when a transaction client is passed', async () => {
      const mockClient = {
        query: jest.fn(),
      };
      const afterIncrement = makeBalance({ usedDays: 10, remainingDays: 10 });
      mockClient.query.mockResolvedValueOnce({ rows: [makeRow(afterIncrement)] });

      const result = await repo.incrementUsedDays('lb-001', 5, mockClient as unknown as import('pg').PoolClient);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(10);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        ['lb-001', 5]
      );
      // The pool should NOT have been called
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
