import { Pool } from 'pg';
import { LeaveBalanceRepository } from '../../../../src/modules/leave/leave-balance.repository';
import { LeaveBalance } from '../../../../src/modules/leave/leave-balance.model';
import { BalanceStatus } from '../../../../src/shared/types/index';

describe('LeaveBalanceRepository', () => {
  let mockQuery: jest.Mock;
  let mockPool: Pool;
  let repo: LeaveBalanceRepository;

  const makeBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
    id: 'balance-1',
    employeeId: 'emp-1',
    policyId: 'policy-1',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    pendingDays: 2,
    fiscalYear: 2024,
    status: BalanceStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = { query: mockQuery } as unknown as Pool;
    repo = new LeaveBalanceRepository(mockPool);
  });

  describe('constructor', () => {
    it('should use the provided pool', () => {
      expect(repo['pool']).toBe(mockPool);
    });
  });

  describe('findById', () => {
    it('should return balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [balance], rowCount: 1 });

      const result = await repo.findById('balance-1');

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balance WHERE id = $1',
        ['balance-1'],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return balances for the employee ordered by fiscal year desc', async () => {
      const balances = [
        makeBalance(),
        makeBalance({ id: 'balance-2', fiscalYear: 2023 }),
      ];
      mockQuery.mockResolvedValueOnce({ rows: balances, rowCount: 2 });

      const result = await repo.findByEmployeeId('emp-1');

      expect(result).toEqual(balances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balance WHERE employee_id = $1 ORDER BY fiscal_year DESC',
        ['emp-1'],
      );
    });

    it('should return empty array when no balances exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeId('emp-none');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [balance], rowCount: 1 });

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'policy-1', 2024);

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balance WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
        ['emp-1', 'policy-1', 2024],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'policy-none', 2024);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the new balance', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'policy-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        pendingDays: 0,
        fiscalYear: 2024,
        status: BalanceStatus.Active,
      };
      const created = makeBalance(input);
      mockQuery.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

      const result = await repo.create(input);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_balance (
        employee_id, leave_policy_id, total_entitlement, used_days,
        remaining_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
        [
          input.employeeId,
          input.policyId,
          input.totalEntitlement,
          input.usedDays,
          input.remainingDays,
          input.pendingDays,
          input.fiscalYear,
          input.status,
        ],
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated balance', async () => {
      const updated = makeBalance({ usedDays: 8, remainingDays: 12 });
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const result = await repo.update('balance-1', {
        usedDays: 8,
        remainingDays: 12,
      });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_balance SET used_days = $1, remaining_days = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [8, 12, 'balance-1'],
      );
    });

    it('should return null when balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { status: BalanceStatus.Exhausted });

      expect(result).toBeNull();
    });

    it('should return existing balance when no fields are provided', async () => {
      const existing = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await repo.update('balance-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balance WHERE id = $1',
        ['balance-1'],
      );
    });
  });

  describe('upsert', () => {
    it('should insert a new balance when no conflict exists', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'policy-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        pendingDays: 0,
        fiscalYear: 2024,
        status: BalanceStatus.Active,
      };
      const created = makeBalance(input);
      mockQuery.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

      const result = await repo.upsert(input);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_balance (
        employee_id, leave_policy_id, total_entitlement, used_days,
        remaining_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, leave_policy_id, fiscal_year)
      DO UPDATE SET
        total_entitlement = EXCLUDED.total_entitlement,
        used_days = EXCLUDED.used_days,
        remaining_days = EXCLUDED.remaining_days,
        pending_days = EXCLUDED.pending_days,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
        [
          input.employeeId,
          input.policyId,
          input.totalEntitlement,
          input.usedDays,
          input.remainingDays,
          input.pendingDays,
          input.fiscalYear,
          input.status,
        ],
      );
    });

    it('should update existing balance on conflict', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'policy-1',
        totalEntitlement: 25,
        usedDays: 10,
        remainingDays: 15,
        pendingDays: 3,
        fiscalYear: 2024,
        status: BalanceStatus.Active,
      };
      const upserted = makeBalance({ id: 'balance-existing', ...input });
      mockQuery.mockResolvedValueOnce({ rows: [upserted], rowCount: 1 });

      const result = await repo.upsert(input);

      expect(result).toEqual(upserted);
    });
  });
});
