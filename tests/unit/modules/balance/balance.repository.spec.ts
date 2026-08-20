import { PgBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { Balance } from '../../../../src/modules/balance/balance.model';
import { BalanceStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeBalanceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'bal-1',
    employee_id: overrides.employee_id ?? 'emp-1',
    leave_type: overrides.leave_type ?? 'annual',
    total_entitlement: overrides.total_entitlement ?? 20,
    used_days: overrides.used_days ?? 5,
    remaining_days: overrides.remaining_days ?? 15,
    fiscal_year: overrides.fiscal_year ?? 2026,
    status: overrides.status ?? 'active',
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-01-01T00:00:00Z'),
  };
}

function makeBalance(overrides: Partial<Balance> = {}): Balance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    leaveType: 'annual',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: BalanceStatus.active,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PgBalanceRepository', () => {
  let repo: PgBalanceRepository;

  beforeEach(() => {
    repo = new PgBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee', async () => {
      const row1 = makeBalanceRow({ id: 'bal-1', leave_type: 'annual' });
      const row2 = makeBalanceRow({ id: 'bal-2', leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByEmployeeId('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeBalance());
      expect(result[1]).toEqual(
        makeBalance({ id: 'bal-2', leaveType: 'sick' }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM balances WHERE employee_id = $1',
        ['emp-1'],
      );
    });

    it('should return empty array when no balances exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndLeaveType', () => {
    it('should return Balance when matching row exists', async () => {
      const row = makeBalanceRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeIdAndLeaveType('emp-1', 'annual');

      expect(result).toEqual(makeBalance());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM balances WHERE employee_id = $1 AND leave_type = $2',
        ['emp-1', 'annual'],
      );
    });

    it('should return null when no matching row found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndLeaveType(
        'emp-1',
        'nonexistent',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeIdAndFiscalYear', () => {
    it('should return balances for employee and fiscal year', async () => {
      const row = makeBalanceRow({ fiscal_year: 2025 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeIdAndFiscalYear('emp-1', 2025);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(makeBalance({ fiscalYear: 2025 }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-1', 2025],
      );
    });

    it('should return empty array when no balances for fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndFiscalYear('emp-1', 2020);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new balance and return the created Balance', async () => {
      const input = {
        employeeId: 'emp-1',
        leaveType: 'annual',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: BalanceStatus.active,
      };
      const row = makeBalanceRow({
        used_days: 0,
        remaining_days: 20,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(
        makeBalance({ usedDays: 0, remainingDays: 20 }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO balances'),
        ['emp-1', 'annual', 20, 0, 20, 2026, 'active'],
      );
    });
  });

  describe('update', () => {
    it('should update balance fields and return the updated Balance', async () => {
      const row = makeBalanceRow({
        total_entitlement: 25,
        remaining_days: 20,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('bal-1', {
        totalEntitlement: 25,
        remainingDays: 20,
      });

      expect(result).toEqual(
        makeBalance({ totalEntitlement: 25, remainingDays: 20 }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE balances SET'),
        expect.arrayContaining(['bal-1', 25, 20]),
      );
    });

    it('should return null when balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', {
        totalEntitlement: 30,
      });

      expect(result).toBeNull();
    });

    it('should return existing balance when no valid keys are provided', async () => {
      const row = makeBalanceRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('bal-1', {});

      expect(result).toEqual(makeBalance());
    });
  });

  describe('deductDays', () => {
    it('should deduct days from remaining and add to used', async () => {
      const row = makeBalanceRow({
        used_days: 8,
        remaining_days: 12,
        status: 'active',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.deductDays('bal-1', 3);

      expect(result).toEqual(
        makeBalance({ usedDays: 8, remainingDays: 12 }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('remaining_days = remaining_days - $2'),
        ['bal-1', 3],
      );
    });

    it('should set status to exhausted when remaining reaches 0', async () => {
      const row = makeBalanceRow({
        used_days: 20,
        remaining_days: 0,
        status: 'exhausted',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.deductDays('bal-1', 15);

      expect(result).toEqual(
        makeBalance({ usedDays: 20, remainingDays: 0, status: BalanceStatus.exhausted }),
      );
    });

    it('should return null when balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.deductDays('nonexistent', 5);

      expect(result).toBeNull();
    });
  });
});
