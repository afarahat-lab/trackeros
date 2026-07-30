import { PgLeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import { BalanceStatus } from '../../../../src/shared/types/index';

// Mock the database pool
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';
const mockQuery = pool.query as jest.Mock;

describe('PgLeaveBalanceRepository', () => {
  let repository: PgLeaveBalanceRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repository = new PgLeaveBalanceRepository();
  });

  const sampleRow = {
    id: 'bal-1',
    employee_id: 'emp-1',
    leave_policy_id: 'pol-1',
    total_entitlement: 20,
    used_days: 5,
    remaining_days: 15,
    fiscal_year: 2025,
    status: BalanceStatus.ACTIVE,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  const expectedBalance: LeaveBalance = {
    id: 'bal-1',
    employeeId: 'emp-1',
    leavePolicyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2025,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  describe('findByEmployeeAndPolicy', () => {
    it('should return a balance when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repository.findByEmployeeAndPolicy('emp-1', 'pol-1');
      expect(result).toEqual(expectedBalance);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND leave_policy_id = $2'),
        ['emp-1', 'pol-1']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByEmployeeAndPolicy('emp-1', 'pol-1');
      expect(result).toBeNull();
    });

    it('should throw a typed error on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repository.findByEmployeeAndPolicy('emp-1', 'pol-1')).rejects.toThrow(
        'Failed to find balance by employee and policy: DB error'
      );
    });

    it('should throw an error when status is invalid', async () => {
      const invalidRow = { ...sampleRow, status: 'INVALID' };
      mockQuery.mockResolvedValueOnce({ rows: [invalidRow] });
      await expect(repository.findByEmployeeAndPolicy('emp-1', 'pol-1')).rejects.toThrow(
        'Invalid balance status from database: INVALID'
      );
    });
  });

  describe('findByEmployee', () => {
    it('should return an array of balances', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repository.findByEmployee('emp-1');
      expect(result).toEqual([expectedBalance]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        ['emp-1']
      );
    });

    it('should return an empty array when none found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByEmployee('emp-1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const newBalanceData = {
      employeeId: 'emp-1',
      leavePolicyId: 'pol-1',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2025,
      status: BalanceStatus.ACTIVE,
    };

    it('should insert and return the created balance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repository.create(newBalanceData);
      expect(result).toEqual(expectedBalance);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [
          'emp-1',
          'pol-1',
          20,
          0,
          20,
          2025,
          BalanceStatus.ACTIVE,
        ]
      );
    });

    it('should throw on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));
      await expect(repository.create(newBalanceData)).rejects.toThrow(
        'Failed to create balance: insert failed'
      );
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated balance', async () => {
      const updatedRow = { ...sampleRow, remaining_days: 10, used_days: 10 };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      const result = await repository.update('bal-1', { remainingDays: 10, usedDays: 10 });
      expect(result).toMatchObject({ remainingDays: 10, usedDays: 10 });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        [10, 10, 'bal-1'] // order: remaining_days, used_days, id
      );
    });

    it('should return null when no fields are provided', async () => {
      const result = await repository.update('bal-1', {});
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return null when id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repository.update('bal-1', { remainingDays: 5 });
      expect(result).toBeNull();
    });
  });

  describe('deductDays', () => {
    it('should atomically decrement remainingDays and increment usedDays', async () => {
      const deductedRow = {
        ...sampleRow,
        remaining_days: 13,
        used_days: 7,
      };
      mockQuery.mockResolvedValueOnce({ rows: [deductedRow] });
      const result = await repository.deductDays('bal-1', 2);
      expect(result).toMatchObject({ remainingDays: 13, usedDays: 7 });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET remaining_days = remaining_days - $1'),
        [2, 'bal-1']
      );
    });

    it('should return null when balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repository.deductDays('bal-1', 1);
      expect(result).toBeNull();
    });

    it('should throw on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('deduct error'));
      await expect(repository.deductDays('bal-1', 1)).rejects.toThrow(
        'Failed to deduct days from balance: deduct error'
      );
    });
  });
});
