import { LeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<{
  id: string;
  employee_id: string;
  policy_id: string;
  total_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: 'ACTIVE' | 'CLOSED';
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'lb-1',
    employee_id: overrides.employee_id ?? 'emp-1',
    policy_id: overrides.policy_id ?? 'lp-1',
    total_entitlement: overrides.total_entitlement ?? 20,
    used_days: overrides.used_days ?? 0,
    pending_days: overrides.pending_days ?? 0,
    remaining_days: overrides.remaining_days ?? 20,
    fiscal_year: overrides.fiscal_year ?? 2026,
    status: overrides.status ?? 'ACTIVE',
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-01-01T00:00:00Z'),
  };
}

const COLUMNS = [
  'id',
  'employee_id',
  'policy_id',
  'total_entitlement',
  'used_days',
  'pending_days',
  'remaining_days',
  'fiscal_year',
  'status',
  'created_at',
  'updated_at',
].join(', ');

describe('LeaveBalanceRepository', () => {
  let repo: LeaveBalanceRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new LeaveBalanceRepository();
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee ordered by fiscal_year DESC, policy_id ASC', async () => {
      const rows = [
        makeRow({ id: 'lb-1', fiscal_year: 2026, policy_id: 'lp-1' }),
        makeRow({ id: 'lb-2', fiscal_year: 2026, policy_id: 'lp-2' }),
        makeRow({ id: 'lb-3', fiscal_year: 2025, policy_id: 'lp-1' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeId('emp-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 ORDER BY fiscal_year DESC, policy_id ASC`,
        ['emp-1'],
      );
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('lb-1');
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].policyId).toBe('lp-1');
      expect(result[0].totalEntitlement).toBe(20);
      expect(result[0].usedDays).toBe(0);
      expect(result[0].pendingDays).toBe(0);
      expect(result[0].remainingDays).toBe(20);
      expect(result[0].fiscalYear).toBe(2026);
      expect(result[0].status).toBe('ACTIVE');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when employee has no balances', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndFiscalYear', () => {
    it('should return balances for an employee and fiscal year', async () => {
      const rows = [
        makeRow({ id: 'lb-1', fiscal_year: 2026, policy_id: 'lp-1' }),
        makeRow({ id: 'lb-2', fiscal_year: 2026, policy_id: 'lp-2' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeIdAndFiscalYear('emp-1', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 ORDER BY policy_id ASC`,
        ['emp-1', 2026],
      );
      expect(result).toHaveLength(2);
      expect(result[0].fiscalYear).toBe(2026);
      expect(result[1].fiscalYear).toBe(2026);
    });

    it('should return empty array when no balances match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndFiscalYear('emp-1', 2020);

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndPolicyId', () => {
    it('should return the single matching balance', async () => {
      const row = makeRow({
        id: 'lb-1',
        employee_id: 'emp-1',
        policy_id: 'lp-1',
        fiscal_year: 2026,
        total_entitlement: 20,
        used_days: 5,
        pending_days: 2,
        remaining_days: 13,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeIdAndPolicyId('emp-1', 'lp-1', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
        ['emp-1', 'lp-1', 2026],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lb-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.policyId).toBe('lp-1');
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.totalEntitlement).toBe(20);
      expect(result!.usedDays).toBe(5);
      expect(result!.pendingDays).toBe(2);
      expect(result!.remainingDays).toBe(13);
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndPolicyId('emp-1', 'lp-1', 2026);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a new leave balance and return it', async () => {
      const row = makeRow({
        id: 'lb-new',
        employee_id: 'emp-1',
        policy_id: 'lp-1',
        total_entitlement: 20,
        used_days: 0,
        pending_days: 0,
        remaining_days: 20,
        fiscal_year: 2026,
        status: 'ACTIVE',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        employeeId: 'emp-1',
        policyId: 'lp-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        ['emp-1', 'lp-1', 20, 0, 0, 20, 2026, 'ACTIVE'],
      );
      expect(result.id).toBe('lb-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.policyId).toBe('lp-1');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.pendingDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
    });

    it('should accept optional usedDays, pendingDays, remainingDays, and status', async () => {
      const row = makeRow({
        id: 'lb-custom',
        employee_id: 'emp-2',
        policy_id: 'lp-2',
        total_entitlement: 15,
        used_days: 3,
        pending_days: 1,
        remaining_days: 11,
        fiscal_year: 2026,
        status: 'CLOSED',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        employeeId: 'emp-2',
        policyId: 'lp-2',
        totalEntitlement: 15,
        usedDays: 3,
        pendingDays: 1,
        remainingDays: 11,
        fiscalYear: 2026,
        status: 'CLOSED',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        ['emp-2', 'lp-2', 15, 3, 1, 11, 2026, 'CLOSED'],
      );
      expect(result.usedDays).toBe(3);
      expect(result.pendingDays).toBe(1);
      expect(result.remainingDays).toBe(11);
      expect(result.status).toBe('CLOSED');
    });

    it('should default remainingDays to totalEntitlement when not provided', async () => {
      const row = makeRow({
        id: 'lb-default-rem',
        employee_id: 'emp-1',
        policy_id: 'lp-1',
        total_entitlement: 10,
        used_days: 0,
        pending_days: 0,
        remaining_days: 10,
        fiscal_year: 2026,
        status: 'ACTIVE',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        employeeId: 'emp-1',
        policyId: 'lp-1',
        totalEntitlement: 10,
        fiscalYear: 2026,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        ['emp-1', 'lp-1', 10, 0, 0, 10, 2026, 'ACTIVE'],
      );
      expect(result.remainingDays).toBe(10);
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated balance', async () => {
      const row = makeRow({
        id: 'lb-1',
        total_entitlement: 25,
        used_days: 5,
        pending_days: 2,
        remaining_days: 18,
        status: 'CLOSED',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lb-1', {
        totalEntitlement: 25,
        usedDays: 5,
        pendingDays: 2,
        remainingDays: 18,
        status: 'CLOSED',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        [25, 5, 2, 18, 'CLOSED', 'lb-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(25);
      expect(result!.usedDays).toBe(5);
      expect(result!.pendingDays).toBe(2);
      expect(result!.remainingDays).toBe(18);
      expect(result!.status).toBe('CLOSED');
    });

    it('should return null when balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { usedDays: 5 });

      expect(result).toBeNull();
    });

    it('should return the existing balance when no fields are provided', async () => {
      const row = makeRow({ id: 'lb-1' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lb-1', {});

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lb-1');
    });

    it('should update only the usedDays field', async () => {
      const row = makeRow({ id: 'lb-1', used_days: 3 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lb-1', { usedDays: 3 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        [3, 'lb-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(3);
    });

    it('should update only the pendingDays field', async () => {
      const row = makeRow({ id: 'lb-1', pending_days: 2 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lb-1', { pendingDays: 2 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        [2, 'lb-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.pendingDays).toBe(2);
    });

    it('should update only the status field', async () => {
      const row = makeRow({ id: 'lb-1', status: 'CLOSED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lb-1', { status: 'CLOSED' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        ['CLOSED', 'lb-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('CLOSED');
    });
  });

  describe('createBatch', () => {
    it('should insert multiple balances in a single query and return them', async () => {
      const rows = [
        makeRow({ id: 'lb-1', employee_id: 'emp-1', policy_id: 'lp-1', fiscal_year: 2026 }),
        makeRow({ id: 'lb-2', employee_id: 'emp-1', policy_id: 'lp-2', fiscal_year: 2026 }),
        makeRow({ id: 'lb-3', employee_id: 'emp-1', policy_id: 'lp-3', fiscal_year: 2026 }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.createBatch([
        { employeeId: 'emp-1', policyId: 'lp-1', totalEntitlement: 20, fiscalYear: 2026 },
        { employeeId: 'emp-1', policyId: 'lp-2', totalEntitlement: 10, fiscalYear: 2026 },
        { employeeId: 'emp-1', policyId: 'lp-3', totalEntitlement: 5, fiscalYear: 2026 },
      ]);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [
          'emp-1', 'lp-1', 20, 0, 0, 20, 2026, 'ACTIVE',
          'emp-1', 'lp-2', 10, 0, 0, 10, 2026, 'ACTIVE',
          'emp-1', 'lp-3', 5, 0, 0, 5, 2026, 'ACTIVE',
        ],
      );
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('lb-1');
      expect(result[1].id).toBe('lb-2');
      expect(result[2].id).toBe('lb-3');
    });

    it('should return empty array when given an empty array', async () => {
      const result = await repo.createBatch([]);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should accept custom usedDays, pendingDays, and status per DTO', async () => {
      const rows = [
        makeRow({ id: 'lb-1', employee_id: 'emp-1', policy_id: 'lp-1', used_days: 2, pending_days: 1, remaining_days: 17, status: 'ACTIVE' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.createBatch([
        { employeeId: 'emp-1', policyId: 'lp-1', totalEntitlement: 20, usedDays: 2, pendingDays: 1, fiscalYear: 2026 },
      ]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        ['emp-1', 'lp-1', 20, 2, 1, 20, 2026, 'ACTIVE'],
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new LeaveBalanceRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findByEmployeeId('emp-1');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('remainingDays invariant', () => {
    it('should compute remainingDays as totalEntitlement - usedDays - pendingDays', async () => {
      const row = makeRow({
        id: 'lb-1',
        total_entitlement: 30,
        used_days: 10,
        pending_days: 3,
        remaining_days: 17,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeIdAndPolicyId('emp-1', 'lp-1', 2026);

      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(30);
      expect(result!.usedDays).toBe(10);
      expect(result!.pendingDays).toBe(3);
      expect(result!.remainingDays).toBe(17);
      expect(result!.remainingDays).toBe(30 - 10 - 3);
    });
  });
});
