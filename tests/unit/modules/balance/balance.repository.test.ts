import { BalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import { Pool, PoolClient } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

function makeBalanceRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'bal-1',
    employee_id: 'emp-1',
    leave_policy_id: 'pol-1',
    total_entitlement: 20,
    used_days: 5,
    remaining_days: 15,
    fiscal_year: 2026,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

function expectedBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('BalanceRepository', () => {
  let repo: BalanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new BalanceRepository();
  });

  describe('findById', () => {
    it('should return a balance when found', async () => {
      const row = makeBalanceRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('bal-1');

      expect(result).toEqual(expectedBalance());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['bal-1'],
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a balance when found for the given employee and policy', async () => {
      const row = makeBalanceRow({ employee_id: 'emp-2', leave_policy_id: 'pol-3' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-2', 'pol-3');

      expect(result).toEqual(
        expectedBalance({ employeeId: 'emp-2', policyId: 'pol-3' }),
      );
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2',
        ['emp-2', 'pol-3'],
      );
    });

    it('should return null when no balance exists for the employee-policy pair', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'pol-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('should return all balances for the given employee and fiscal year', async () => {
      const row1 = makeBalanceRow();
      const row2 = makeBalanceRow({
        id: 'bal-2',
        leave_policy_id: 'pol-2',
        total_entitlement: 10,
        used_days: 0,
        remaining_days: 10,
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-1', 2026);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedBalance());
      expect(result[1]).toEqual(
        expectedBalance({
          id: 'bal-2',
          policyId: 'pol-2',
          totalEntitlement: 10,
          usedDays: 0,
          remainingDays: 10,
        }),
      );
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 ORDER BY leave_policy_id',
        ['emp-1', 2026],
      );
    });

    it('should return empty array when no balances exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-1', 2025);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new balance', async () => {
      const input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: 'ACTIVE',
      };

      const row = makeBalanceRow({ used_days: 0, remaining_days: 20 });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(expectedBalance({ usedDays: 0, remainingDays: 20 }));
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql: string = (pool.query as jest.Mock).mock.calls[0][0];
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(sql).toContain('INSERT INTO leave_balances');
      expect(params[0]).toBe('emp-1');
      expect(params[1]).toBe('pol-1');
      expect(params[2]).toBe(20);
      expect(params[3]).toBe(0);
      expect(params[4]).toBe(20);
      expect(params[5]).toBe(2026);
      expect(params[6]).toBe('ACTIVE');
    });

    it('should create a balance with EXHAUSTED status', async () => {
      const input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 20,
        remainingDays: 0,
        fiscalYear: 2026,
        status: 'EXHAUSTED',
      };

      const row = makeBalanceRow({
        used_days: 20,
        remaining_days: 0,
        status: 'EXHAUSTED',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result.status).toBe('EXHAUSTED');
      expect(result.remainingDays).toBe(0);
    });
  });

  describe('update', () => {
    it('should update and return the balance', async () => {
      const existingRow = makeBalanceRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makeBalanceRow({
        total_entitlement: 25,
        remaining_days: 20,
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('bal-1', { totalEntitlement: 25, remainingDays: 20 });

      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(25);
      expect(result!.remainingDays).toBe(20);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when balance does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { status: 'EXHAUSTED' });

      expect(result).toBeNull();
    });

    it('should return existing balance when no fields to update', async () => {
      const existingRow = makeBalanceRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('bal-1', {});

      expect(result).toEqual(expectedBalance());
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should not allow changing employeeId or policyId via update', async () => {
      const existingRow = makeBalanceRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('bal-1', {
        employeeId: 'emp-other',
        policyId: 'pol-other',
      } as Partial<LeaveBalance>);

      expect(result).not.toBeNull();
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.policyId).toBe('pol-1');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should update status to EXHAUSTED', async () => {
      const existingRow = makeBalanceRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makeBalanceRow({
        status: 'EXHAUSTED',
        remaining_days: 0,
        used_days: 20,
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('bal-1', { status: 'EXHAUSTED' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('EXHAUSTED');
    });
  });

  describe('updateUsedDays', () => {
    it('should update usedDays and remainingDays and return the balance', async () => {
      const updatedRow = makeBalanceRow({
        used_days: 8,
        remaining_days: 12,
        updated_at: '2026-08-01T00:00:00.000Z',
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateUsedDays('bal-1', 8, 12);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
      expect(pool.query).toHaveBeenCalledWith(
        `UPDATE leave_balances
       SET used_days = $1, remaining_days = $2, updated_at = $3
       WHERE id = $4
       RETURNING *`,
        [8, 12, expect.any(Date), 'bal-1'],
      );
    });

    it('should return null when balance does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateUsedDays('nonexistent', 5, 15);

      expect(result).toBeNull();
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided PoolClient instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as PoolClient;
      const clientRepo = new BalanceRepository(mockClient);

      const row = makeBalanceRow();
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [row] });

      const result = await clientRepo.findById('bal-1');

      expect(result).toEqual(expectedBalance());
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['bal-1'],
      );
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
