import { PgLeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';
import { BalanceStatus } from '../../../../src/shared/types/leave.types';
import { UniqueConstraintViolationError } from '../../../../src/modules/employee/employee.repository';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'bal-001',
    employee_id: 'emp-001',
    policy_id: 'pol-001',
    total_entitlement: 20,
    used_days: 5,
    remaining_days: 15,
    fiscal_year: 2026,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    policyId: 'pol-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;

  beforeEach(() => {
    repo = new PgLeaveBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findByEmployeeAndPolicy', () => {
    it('returns the balance when found with fiscal year filter', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3'),
        ['emp-001', 'pol-001', 2026],
      );
      expect(result).toEqual(makeLeaveBalance());
    });

    it('returns the balance when found without fiscal year filter', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND policy_id = $2'),
        ['emp-001', 'pol-001'],
      );
      expect(result).toEqual(makeLeaveBalance());
    });

    it('returns null when no row matches with fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(result).toBeNull();
    });

    it('returns null when no row matches without fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001');

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByEmployeeAndPolicy(
        'emp-001', 'pol-001', 2026,
        client as unknown as import('pg').PoolClient,
      );

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('returns balances for the employee in the given fiscal year', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'bal-002', policy_id: 'pol-002' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND fiscal_year = $2'),
        ['emp-001', 2026],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[1].id).toBe('bal-002');
    });

    it('returns an empty array when no balances exist for the fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndFiscalYear('emp-001', 2026);

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByEmployeeAndFiscalYear(
        'emp-001', 2026,
        client as unknown as import('pg').PoolClient,
      );

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByEmployeeId', () => {
    it('returns all balances for the employee across all fiscal years', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'bal-002', fiscal_year: 2025 }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1',
        ['emp-001'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[1].id).toBe('bal-002');
    });

    it('returns an empty array when no balances exist for the employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByEmployeeId('emp-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const input = {
      employeeId: 'emp-001',
      policyId: 'pol-001',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: BalanceStatus.ACTIVE,
    };

    it('persists a new leave balance and returns the entity with server-generated fields', async () => {
      const row = makeRow({ used_days: 0, remaining_days: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [
          'emp-001',
          'pol-001',
          20,
          0,
          20,
          2026,
          'ACTIVE',
        ],
      );
      expect(result).toEqual(makeLeaveBalance({ usedDays: 0, remainingDays: 20 }));
    });

    it('throws UniqueConstraintViolationError on unique violation (code 23505)', async () => {
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow(UniqueConstraintViolationError);
    });

    it('re-throws non-unique-constraint errors', async () => {
      const pgError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow('connection refused');
    });
  });

  describe('update', () => {
    it('updates supplied fields and returns the refreshed entity', async () => {
      const updatedRow = makeRow({
        total_entitlement: 25,
        remaining_days: 20,
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('bal-001', { totalEntitlement: 25 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [25, 'bal-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(25);
      expect(result!.updatedAt).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    });

    it('returns null when the balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('bal-999', { totalEntitlement: 25 });

      expect(result).toBeNull();
    });

    it('returns the existing balance when updates object is empty', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('bal-001', {});

      expect(result).toEqual(makeLeaveBalance());
    });

    it('advances updatedAt on successful update', async () => {
      const updatedRow = makeRow({ updated_at: '2026-08-15T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('bal-001', { status: BalanceStatus.CLOSED });

      expect(result!.updatedAt).toEqual(new Date('2026-08-15T00:00:00.000Z'));
    });
  });

  describe('deductDays', () => {
    it('atomically increments usedDays and decrements remainingDays', async () => {
      const updatedRow = makeRow({ used_days: 8, remaining_days: 12 });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.deductDays('bal-001', 3);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [3, 'bal-001', BalanceStatus.EXHAUSTED],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
    });

    it('transitions status to EXHAUSTED when remainingDays reaches 0', async () => {
      const updatedRow = makeRow({
        used_days: 20,
        remaining_days: 0,
        status: 'EXHAUSTED',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.deductDays('bal-001', 15);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(BalanceStatus.EXHAUSTED);
      expect(result!.remainingDays).toBe(0);
    });

    it('returns null when the balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.deductDays('bal-999', 3);

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow({ used_days: 8, remaining_days: 12 })] }) };
      await repo.deductDays('bal-001', 3, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('restoreDays', () => {
    it('atomically decrements usedDays and increments remainingDays', async () => {
      const updatedRow = makeRow({ used_days: 2, remaining_days: 18 });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.restoreDays('bal-001', 3);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [3, 'bal-001', BalanceStatus.EXHAUSTED, BalanceStatus.ACTIVE],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(2);
      expect(result!.remainingDays).toBe(18);
    });

    it('transitions status from EXHAUSTED to ACTIVE when remainingDays becomes positive', async () => {
      const updatedRow = makeRow({
        used_days: 17,
        remaining_days: 3,
        status: 'ACTIVE',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.restoreDays('bal-001', 3);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(BalanceStatus.ACTIVE);
      expect(result!.remainingDays).toBe(3);
    });

    it('returns null when the balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.restoreDays('bal-999', 3);

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow({ used_days: 2, remaining_days: 18 })] }) };
      await repo.restoreDays('bal-001', 3, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('rowToLeaveBalance (via findById pattern)', () => {
    it('converts date strings to Date objects', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it('casts status to BalanceStatus enum', async () => {
      const row = makeRow({ status: 'EXHAUSTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(result!.status).toBe(BalanceStatus.EXHAUSTED);
    });

    it('preserves numeric fields as numbers', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndPolicy('emp-001', 'pol-001', 2026);

      expect(typeof result!.totalEntitlement).toBe('number');
      expect(typeof result!.usedDays).toBe('number');
      expect(typeof result!.remainingDays).toBe('number');
      expect(typeof result!.fiscalYear).toBe('number');
    });
  });
});
