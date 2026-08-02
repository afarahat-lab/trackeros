import { PgLeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import type { LeaveBalance, LeaveBalanceWithRemaining } from '../../../../src/modules/balance/balance.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'bal-001',
    employee_id: overrides.employee_id ?? 'emp-001',
    leave_policy_id: overrides.leave_policy_id ?? 'pol-001',
    total_entitlement: overrides.total_entitlement ?? 20,
    used_days: overrides.used_days ?? 5,
    fiscal_year: overrides.fiscal_year ?? 2026,
    status: overrides.status ?? 'ACTIVE',
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-06-01T00:00:00Z'),
  };
}

function makeEntity(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    leavePolicyId: 'pol-001',
    totalEntitlement: 20,
    usedDays: 5,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;

  beforeEach(() => {
    repo = new PgLeaveBalanceRepository();
    jest.clearAllMocks();
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a LeaveBalanceWithRemaining when a row matches', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.leavePolicyId).toBe('pol-001');
      expect(result!.totalEntitlement).toBe(20);
      expect(result!.usedDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.status).toBe('ACTIVE');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
        ['emp-001', 'pol-001', 2026],
      );
    });

    it('should compute remainingDays as totalEntitlement - usedDays', async () => {
      const row = makeRow({ total_entitlement: 30, used_days: 12 });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(result!.remainingDays).toBe(18);
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmployeeAndPolicy('nonexistent', 'pol-001', 2026);

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      await expect(
        repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026),
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return an array of LeaveBalanceWithRemaining for matching rows', async () => {
      const row1 = makeRow({ id: 'bal-001' });
      const row2 = makeRow({ id: 'bal-002', leave_policy_id: 'pol-002', used_days: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByEmployeeId('emp-001', 2026);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[0].remainingDays).toBe(15);
      expect(result[1].id).toBe('bal-002');
      expect(result[1].remainingDays).toBe(20);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-001', 2026],
      );
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmployeeId('emp-001', 2026);

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByEmployeeId('emp-001', 2026)).rejects.toThrow('Query timeout');
    });
  });

  describe('create', () => {
    const input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId: 'emp-001',
      leavePolicyId: 'pol-001',
      totalEntitlement: 20,
      usedDays: 0,
      fiscalYear: 2026,
      status: 'ACTIVE',
    };

    it('should insert and return a fully-populated LeaveBalanceWithRemaining', async () => {
      const returnedRow = makeRow({
        id: 'generated-id',
        employee_id: 'emp-001',
        leave_policy_id: 'pol-001',
        total_entitlement: 20,
        used_days: 0,
        fiscal_year: 2026,
        status: 'ACTIVE',
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.employeeId).toBe('emp-001');
      expect(result.leavePolicyId).toBe('pol-001');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO leave_balances');
      expect(queryCall[1][1]).toBe('emp-001');
      expect(queryCall[1][2]).toBe('pol-001');
      expect(queryCall[1][3]).toBe(20);
      expect(queryCall[1][4]).toBe(0);
      expect(queryCall[1][5]).toBe(2026);
      expect(queryCall[1][6]).toBe('ACTIVE');
    });

    it('should reject on a unique-constraint violation', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('updateUsedDays', () => {
    it('should atomically update used_days and return the updated entity with computed remainingDays', async () => {
      const updatedRow = makeRow({
        id: 'bal-001',
        used_days: 8,
        updated_at: new Date('2026-07-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 } as never);

      const result = await repo.updateUsedDays('bal-001', 8);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-001');
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET used_days'),
        [8, expect.any(Date), 'bal-001'],
      );
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.updateUsedDays('nonexistent', 5);

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.updateUsedDays('bal-001', 5)).rejects.toThrow('Connection refused');
    });
  });
});
