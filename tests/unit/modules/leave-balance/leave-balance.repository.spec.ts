import { LeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'lb-1',
    employee_id: 'emp-1',
    leave_type_id: 'lt-annual',
    policy_id: 'lp-1',
    total_entitlement: 20,
    used_days: 5,
    pending_days: 2,
    fiscal_year: 2026,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LeaveBalanceRepository', () => {
  let repo: LeaveBalanceRepository;

  beforeEach(() => {
    repo = new LeaveBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave balance when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lb-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lb-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.leaveTypeId).toBe('lt-annual');
      expect(result!.policyId).toBe('lp-1');
      expect(result!.totalEntitlement).toBe(20);
      expect(result!.usedDays).toBe(5);
      expect(result!.pendingDays).toBe(2);
      expect(result!.remainingDays).toBe(15);
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.status).toBe('ACTIVE');
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['lb-1'],
      );
    });

    it('should return null when leave balance not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('lb-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployeeAndType', () => {
    it('should return a leave balance when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeAndType('emp-1', 'lt-annual', 2026);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lb-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.leaveTypeId).toBe('lt-annual');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND fiscal_year = $3',
        ['emp-1', 'lt-annual', 2026],
      );
    });

    it('should return null when no matching balance exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndType('emp-1', 'lt-annual', 2026);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(
        repo.findByEmployeeAndType('emp-1', 'lt-annual', 2026),
      ).rejects.toThrow('db error');
    });
  });

  describe('findByEmployee', () => {
    it('should return all balances for an employee in a fiscal year', async () => {
      const row1 = makeRow({ id: 'lb-1', leave_type_id: 'lt-annual' });
      const row2 = makeRow({ id: 'lb-2', leave_type_id: 'lt-sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByEmployee('emp-1', 2026);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lb-1');
      expect(result[1].id).toBe('lb-2');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-1', 2026],
      );
    });

    it('should return an empty array when no balances exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployee('emp-1', 2026);

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByEmployee('emp-1', 2026)).rejects.toThrow('db error');
    });
  });

  describe('create', () => {
    const createInput = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-annual',
      policyId: 'lp-1',
      totalEntitlement: 20,
      usedDays: 0,
      pendingDays: 0,
      fiscalYear: 2026,
      status: 'ACTIVE' as const,
    };

    it('should create and return a fully-populated leave balance', async () => {
      const returnedRow = makeRow({
        id: 'lb-new',
        used_days: 0,
        pending_days: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(createInput);

      expect(result.id).toBe('lb-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.leaveTypeId).toBe('lt-annual');
      expect(result.policyId).toBe('lp-1');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.pendingDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(uniqueError);

      await expect(repo.create(createInput)).rejects.toThrow(
        'duplicate key value violates unique constraint',
      );
    });

    it('should propagate general database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.create(createInput)).rejects.toThrow('db error');
    });
  });

  describe('update', () => {
    it('should update only provided fields and return the updated balance', async () => {
      const updatedRow = makeRow({
        total_entitlement: 25,
        status: 'EXHAUSTED',
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lb-1', {
        totalEntitlement: 25,
        status: 'EXHAUSTED',
      });

      expect(result).not.toBeNull();
      expect(result!.totalEntitlement).toBe(25);
      expect(result!.status).toBe('EXHAUSTED');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        expect.arrayContaining(['lb-1', 25, 'EXHAUSTED']),
      );
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { status: 'EXHAUSTED' });

      expect(result).toBeNull();
    });

    it('should not allow updating id, createdAt, updatedAt, or remainingDays', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('lb-1', {
        id: 'hacked-id',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01'),
        remainingDays: 999,
        status: 'FROZEN',
      });

      const sqlArg = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlArg.match(/SET (.+?) WHERE/s)?.[1] ?? '';
      expect(setClause).not.toContain('id =');
      expect(setClause).not.toContain('created_at');
      expect(setClause).not.toContain('remaining_days');
      expect(setClause).toContain('status');
      expect(setClause).toContain('updated_at = NOW()');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.update('lb-1', { status: 'FROZEN' })).rejects.toThrow('db error');
    });
  });

  describe('incrementUsedDays', () => {
    it('should atomically increment used_days and return the updated balance', async () => {
      const updatedRow = makeRow({
        used_days: 8,
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.incrementUsedDays('lb-1', 3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET used_days = used_days + $2'),
        ['lb-1', 3],
      );
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.incrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.incrementUsedDays('lb-1', 3)).rejects.toThrow('db error');
    });
  });

  describe('decrementUsedDays', () => {
    it('should atomically decrement used_days and return the updated balance', async () => {
      const updatedRow = makeRow({
        used_days: 2,
        updated_at: '2026-07-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.decrementUsedDays('lb-1', 3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(2);
      expect(result!.remainingDays).toBe(18);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET used_days = used_days - $2'),
        ['lb-1', 3],
      );
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.decrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.decrementUsedDays('lb-1', 3)).rejects.toThrow('db error');
    });
  });

  describe('remainingDays computation', () => {
    it('should compute remainingDays as totalEntitlement - usedDays', async () => {
      const row = makeRow({ total_entitlement: 30, used_days: 10 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lb-1');

      expect(result!.remainingDays).toBe(20);
    });

    it('should compute remainingDays as zero when used equals entitlement', async () => {
      const row = makeRow({ total_entitlement: 20, used_days: 20 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lb-1');

      expect(result!.remainingDays).toBe(0);
    });
  });
});
