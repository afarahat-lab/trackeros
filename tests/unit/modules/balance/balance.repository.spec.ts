
import { Pool } from 'pg';
import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance } from '../../../../src/modules/balance/balance.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

const makeBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: 1,
  employeeId: 100,
  policyId: 10,
  totalEntitlement: 20,
  usedDays: 5,
  pendingDays: 2,
  availableDays: 13,
  fiscalYear: 2026,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('LeaveBalanceRepository', () => {
  let repo: LeaveBalanceRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repo = new LeaveBalanceRepository(mockPool);
  });

  describe('findByEmployeeId', () => {
    it('should return balances for an employee', async () => {
      const balances = [makeBalance(), makeBalance({ id: 2, policyId: 11 })];
      mockQuery.mockResolvedValueOnce({ rows: balances });

      const result = await repo.findByEmployeeId(100);
      expect(result).toEqual(balances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1',
        [100]
      );
    });

    it('should return empty array when no balances found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId(999);
      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a balance when found', async () => {
      const balance = makeBalance();
      mockQuery.mockResolvedValueOnce({ rows: [balance] });

      const result = await repo.findByEmployeeAndPolicy(100, 10);
      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2',
        [100, 10]
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy(100, 999);
      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('should return balances for employee and fiscal year', async () => {
      const balances = [makeBalance(), makeBalance({ id: 2, policyId: 11 })];
      mockQuery.mockResolvedValueOnce({ rows: balances });

      const result = await repo.findByEmployeeAndFiscalYear(100, 2026);
      expect(result).toEqual(balances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        [100, 2026]
      );
    });

    it('should return empty array when no balances match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndFiscalYear(100, 2020);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new balance', async () => {
      const input = {
        employeeId: 200,
        policyId: 10,
        totalEntitlement: 20,
        usedDays: 0,
        pendingDays: 0,
        availableDays: 20,
        fiscalYear: 2026,
      };
      const created = makeBalance({ id: 3, ...input });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [200, 10, 20, 0, 0, 20, 2026]
      );
    });
  });

  describe('update', () => {
    it('should update and return the balance', async () => {
      const updated = makeBalance({ totalEntitlement: 25, availableDays: 18 });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update(1, { totalEntitlement: 25 });
      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        [25, 1]
      );
    });

    it('should return null when no fields to update', async () => {
      const result = await repo.update(1, {});
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update(999, { totalEntitlement: 30 });
      expect(result).toBeNull();
    });
  });

  describe('deductDays', () => {
    it('should deduct days from used_days and recalculate available_days', async () => {
      const deducted = makeBalance({ usedDays: 8, availableDays: 10 });
      mockQuery.mockResolvedValueOnce({ rows: [deducted] });

      const result = await repo.deductDays(1, 3);
      expect(result).toEqual(deducted);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [1, 3]
      );
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.deductDays(999, 3);
      expect(result).toBeNull();
    });
  });

  describe('restoreDays', () => {
    it('should restore days to used_days and recalculate available_days', async () => {
      const restored = makeBalance({ usedDays: 2, availableDays: 16 });
      mockQuery.mockResolvedValueOnce({ rows: [restored] });

      const result = await repo.restoreDays(1, 3);
      expect(result).toEqual(restored);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [1, 3]
      );
    });

    it('should not go below zero when restoring more than used', async () => {
      const restored = makeBalance({ usedDays: 0, availableDays: 18 });
      mockQuery.mockResolvedValueOnce({ rows: [restored] });

      const result = await repo.restoreDays(1, 10);
      expect(result).toEqual(restored);
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.restoreDays(999, 3);
      expect(result).toBeNull();
    });
  });
});
