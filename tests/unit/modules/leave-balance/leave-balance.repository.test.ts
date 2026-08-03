import { Pool } from 'pg';
import { LeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

const mockLeaveBalanceRow: Record<string, unknown> = {
  id: 'lb-001',
  employee_id: 'emp-001',
  leave_policy_id: 'lp-001',
  total_entitlement: 20,
  used_days: 5,
  fiscal_year: 2026,
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

const mockExhaustedLeaveBalanceRow: Record<string, unknown> = {
  id: 'lb-002',
  employee_id: 'emp-001',
  leave_policy_id: 'lp-002',
  total_entitlement: 10,
  used_days: 10,
  fiscal_year: 2026,
  status: 'EXHAUSTED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
};

function expectLeaveBalanceMatchesRow(
  leaveBalance: LeaveBalance,
  row: Record<string, unknown>,
): void {
  expect(leaveBalance.id).toBe(row.id);
  expect(leaveBalance.employeeId).toBe(row.employee_id);
  expect(leaveBalance.leavePolicyId).toBe(row.leave_policy_id);
  expect(leaveBalance.totalEntitlement).toBe(row.total_entitlement);
  expect(leaveBalance.usedDays).toBe(row.used_days);
  expect(leaveBalance.remainingDays).toBe(
    (row.total_entitlement as number) - (row.used_days as number),
  );
  expect(leaveBalance.fiscalYear).toBe(row.fiscal_year);
  expect(leaveBalance.status).toBe(row.status);
  expect(leaveBalance.createdAt).toEqual(new Date(row.created_at as string));
  expect(leaveBalance.updatedAt).toEqual(new Date(row.updated_at as string));
}

describe('LeaveBalanceRepository', () => {
  let repository: LeaveBalanceRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repository = new LeaveBalanceRepository(mockPool);
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a LeaveBalance when a row matches the composite key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveBalanceRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
        ['emp-001', 'lp-001', 2026],
      );
      expect(result).not.toBeNull();
      expectLeaveBalanceMatchesRow(result!, mockLeaveBalanceRow);
    });

    it('should return null when no row matches the composite key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeAndPolicy('nonexistent', 'lp-001', 2026);

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByEmployeeAndPolicy("1' OR '1'='1", 'lp-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
        ["1' OR '1'='1", 'lp-001', 2026],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(
        repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026),
      ).rejects.toThrow(
        'Failed to find leave balance by employee and policy: connection refused',
      );
    });
  });

  describe('findByEmployee', () => {
    it('should return LeaveBalances when rows match the given employee and fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockLeaveBalanceRow, mockExhaustedLeaveBalanceRow],
      });

      const result = await repository.findByEmployee('emp-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-001', 2026],
      );
      expect(result).toHaveLength(2);
      expectLeaveBalanceMatchesRow(result[0], mockLeaveBalanceRow);
      expectLeaveBalanceMatchesRow(result[1], mockExhaustedLeaveBalanceRow);
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployee('nonexistent', 2026);

      expect(result).toEqual([]);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByEmployee("1' OR '1'='1", 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ["1' OR '1'='1", 2026],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByEmployee('emp-001', 2026)).rejects.toThrow(
        'Failed to find leave balances by employee: connection refused',
      );
    });
  });

  describe('create', () => {
    const createInput: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId: 'emp-001',
      leavePolicyId: 'lp-001',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: 'ACTIVE',
    };

    it('should persist a new leave_balances row and return the created LeaveBalance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveBalanceRow] });

      const result = await repository.create(createInput);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_balances (employee_id, leave_policy_id, total_entitlement, used_days, fiscal_year, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['emp-001', 'lp-001', 20, 0, 2026, 'ACTIVE'],
      );
      expect(result).not.toBeNull();
      expectLeaveBalanceMatchesRow(result, mockLeaveBalanceRow);
    });

    it('should throw when the pool query fails (including unique-constraint violation)', async () => {
      mockQuery.mockRejectedValueOnce(
        new Error('duplicate key value violates unique constraint'),
      );

      await expect(repository.create(createInput)).rejects.toThrow(
        'Failed to create leave balance: duplicate key value violates unique constraint',
      );
    });
  });

  describe('updateUsedDays', () => {
    it('should update used_days and return the updated LeaveBalance', async () => {
      const updatedRow: Record<string, unknown> = {
        ...mockLeaveBalanceRow,
        used_days: 7,
      };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.updateUsedDays('lb-001', 7);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_balances SET used_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [7, 'lb-001'],
      );
      expect(result).not.toBeNull();
      expect(result.usedDays).toBe(7);
      expect(result.remainingDays).toBe(13);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveBalanceRow] });

      await repository.updateUsedDays("1' OR '1'='1", 5);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_balances SET used_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [5, "1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.updateUsedDays('lb-001', 7)).rejects.toThrow(
        'Failed to update used days: connection refused',
      );
    });
  });

  describe('remainingDays derivation', () => {
    it('should compute remainingDays as totalEntitlement - usedDays', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveBalanceRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026);

      expect(result).not.toBeNull();
      expect(result!.remainingDays).toBe(15);
      expect(result!.remainingDays).toBe(
        result!.totalEntitlement - result!.usedDays,
      );
    });

    it('should compute remainingDays as zero when usedDays equals totalEntitlement', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockExhaustedLeaveBalanceRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-002', 2026);

      expect(result).not.toBeNull();
      expect(result!.remainingDays).toBe(0);
    });
  });

  describe('status values', () => {
    it('should return ACTIVE status when present on the row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveBalanceRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('ACTIVE');
    });

    it('should return EXHAUSTED status when present on the row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockExhaustedLeaveBalanceRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-002', 2026);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('EXHAUSTED');
    });

    it('should return CLOSED status when present on the row', async () => {
      const closedRow: Record<string, unknown> = {
        ...mockLeaveBalanceRow,
        id: 'lb-003',
        status: 'CLOSED',
      };
      mockQuery.mockResolvedValueOnce({ rows: [closedRow] });

      const result = await repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('CLOSED');
    });
  });
});
