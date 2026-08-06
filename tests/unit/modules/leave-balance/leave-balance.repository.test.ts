import { PgLeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeLeaveBalanceRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'bal-001',
    employee_id: 'emp-001',
    leave_policy_id: 'policy-001',
    total_entitlement: 20,
    used_days: 5,
    remaining_days: 15,
    fiscal_year: 2026,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  const now = new Date();
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    policyId: 'policy-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgLeaveBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave balance when found', async () => {
      const row = makeLeaveBalanceRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('bal-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['bal-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.policyId).toBe('policy-001');
      expect(result!.totalEntitlement).toBe(20);
      expect(result!.usedDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.status).toBe('ACTIVE');
    });

    it('should return null when balance is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, employee_id: 'emp-001' }], rowCount: 1 });

      const result = await repo.findById('bal-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('bal-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee', async () => {
      const row1 = makeLeaveBalanceRow({ id: 'bal-001' });
      const row2 = makeLeaveBalanceRow({ id: 'bal-002', leave_policy_id: 'policy-002', status: 'EXHAUSTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1',
        ['emp-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[1].id).toBe('bal-002');
      expect(result[1].status).toBe('EXHAUSTED');
    });

    it('should return an empty array when no balances found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveBalanceRow({ id: 'bal-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bal-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByEmployeeId('emp-001')).rejects.toThrow('query failed');
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return the balance for a specific employee and policy', async () => {
      const row = makeLeaveBalanceRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'policy-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2',
        ['emp-001', 'policy-001']
      );
      expect(result).not.toBeNull();
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.policyId).toBe('policy-001');
    });

    it('should return null when no balance exists for the employee and policy', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'policy-999');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'policy-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(
        repo.findByEmployeeAndPolicy('emp-001', 'policy-001')
      ).rejects.toThrow('query failed');
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('should return all balances for an employee in a fiscal year', async () => {
      const row1 = makeLeaveBalanceRow({ id: 'bal-001' });
      const row2 = makeLeaveBalanceRow({ id: 'bal-002', leave_policy_id: 'policy-002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-001', 2026]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[1].id).toBe('bal-002');
    });

    it('should return an empty array when no balances found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2025);

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveBalanceRow({ id: 'bal-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2026);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bal-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(
        repo.findByEmployeeAndFiscalYear('emp-001', 2026)
      ).rejects.toThrow('query failed');
    });
  });

  describe('create', () => {
    it('should create a leave balance and return it', async () => {
      const input = {
        employeeId: 'emp-002',
        policyId: 'policy-001',
        totalEntitlement: 15,
        usedDays: 0,
        remainingDays: 15,
        fiscalYear: 2026,
        status: 'ACTIVE' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeaveBalanceRow({
          id: 'generated-id',
          employee_id: 'emp-002',
          leave_policy_id: 'policy-001',
          total_entitlement: 15,
          used_days: 0,
          remaining_days: 15,
          fiscal_year: 2026,
          status: 'ACTIVE',
        })],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO leave_balances');
      expect(queryText).toContain('RETURNING *');
      expect(result.employeeId).toBe('emp-002');
      expect(result.policyId).toBe('policy-001');
      expect(result.totalEntitlement).toBe(15);
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(15);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          employeeId: 'emp-003',
          policyId: 'policy-001',
          totalEntitlement: 10,
          usedDays: 0,
          remainingDays: 10,
          fiscalYear: 2026,
          status: 'ACTIVE',
        })
      ).rejects.toThrow('Failed to create leave balance');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          employeeId: 'emp-003',
          policyId: 'policy-001',
          totalEntitlement: 10,
          usedDays: 0,
          remainingDays: 10,
          fiscalYear: 2026,
          status: 'ACTIVE',
        })
      ).rejects.toThrow('Failed to create leave balance');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(
        repo.create({
          employeeId: 'emp-003',
          policyId: 'policy-001',
          totalEntitlement: 10,
          usedDays: 0,
          remainingDays: 10,
          fiscalYear: 2026,
          status: 'ACTIVE',
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('update', () => {
    it('should update a leave balance and return the updated record', async () => {
      const updatedRow = makeLeaveBalanceRow({
        used_days: 8,
        remaining_days: 12,
        status: 'ACTIVE',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('bal-001', {
        usedDays: 8,
        remainingDays: 12,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('UPDATE leave_balances SET');
      expect(queryText).toContain('used_days = $1');
      expect(queryText).toContain('remaining_days = $2');
      expect(queryText).toContain('updated_at = $3');
      expect(queryText).toContain('WHERE id = $4');
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
    });

    it('should return null when balance is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { usedDays: 1 });

      expect(result).toBeNull();
    });

    it('should return current balance when no fields are provided', async () => {
      const row = makeLeaveBalanceRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.update('bal-001', {});

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM leave_balances WHERE id = $1');
      expect(result).not.toBeNull();
    });

    it('should handle status update to EXHAUSTED', async () => {
      const updatedRow = makeLeaveBalanceRow({ status: 'EXHAUSTED', remaining_days: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('bal-001', { status: 'EXHAUSTED', remainingDays: 0 });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('EXHAUSTED');
      expect(result!.remainingDays).toBe(0);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.update('bal-001', { usedDays: 1 })
      ).rejects.toThrow('update failed');
    });
  });

  describe('upsert', () => {
    it('should insert a new balance when no conflict exists', async () => {
      const input = {
        employeeId: 'emp-001',
        policyId: 'policy-001',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: 'ACTIVE' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeaveBalanceRow({
          id: 'generated-id',
          employee_id: 'emp-001',
          leave_policy_id: 'policy-001',
          total_entitlement: 20,
          used_days: 0,
          remaining_days: 20,
          fiscal_year: 2026,
          status: 'ACTIVE',
        })],
        rowCount: 1,
      });

      const result = await repo.upsert(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO leave_balances');
      expect(queryText).toContain('ON CONFLICT (employee_id, leave_policy_id, fiscal_year)');
      expect(queryText).toContain('DO UPDATE SET');
      expect(queryText).toContain('RETURNING *');
      expect(result.employeeId).toBe('emp-001');
      expect(result.policyId).toBe('policy-001');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
    });

    it('should update on conflict and return the updated balance', async () => {
      const input = {
        employeeId: 'emp-001',
        policyId: 'policy-001',
        totalEntitlement: 20,
        usedDays: 5,
        remainingDays: 15,
        fiscalYear: 2026,
        status: 'ACTIVE' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeaveBalanceRow({
          id: 'existing-id',
          employee_id: 'emp-001',
          leave_policy_id: 'policy-001',
          total_entitlement: 20,
          used_days: 5,
          remaining_days: 15,
          fiscal_year: 2026,
          status: 'ACTIVE',
        })],
        rowCount: 1,
      });

      const result = await repo.upsert(input);

      expect(result).not.toBeNull();
      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
    });

    it('should throw when returned row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.upsert({
          employeeId: 'emp-001',
          policyId: 'policy-001',
          totalEntitlement: 20,
          usedDays: 0,
          remainingDays: 20,
          fiscalYear: 2026,
          status: 'ACTIVE',
        })
      ).rejects.toThrow('Failed to create leave balance');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('upsert failed'));

      await expect(
        repo.upsert({
          employeeId: 'emp-001',
          policyId: 'policy-001',
          totalEntitlement: 20,
          usedDays: 0,
          remainingDays: 20,
          fiscalYear: 2026,
          status: 'ACTIVE',
        })
      ).rejects.toThrow('upsert failed');
    });
  });
});
