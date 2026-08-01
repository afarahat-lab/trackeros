import { BalanceRepository, InsufficientBalanceError } from 'modules/balance';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bal-1',
    employee_id: 'emp-1',
    policy_id: 'pol-1',
    total_entitlement: 20,
    used_days: 5,
    fiscal_year: 2026,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('BalanceRepository', () => {
  let repo: BalanceRepository;

  beforeEach(() => {
    repo = new BalanceRepository();
    mockQuery.mockReset();
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a LeaveBalance when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'pol-1', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM leave_balances
       WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
        ['emp-1', 'pol-1', 2026],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.policyId).toBe('pol-1');
      expect(result!.totalEntitlement).toBe(20);
      expect(result!.usedDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.status).toBe('ACTIVE');
      expect(result!.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2026-06-15T12:00:00.000Z'));
    });

    it('should return null when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'pol-1', 2026);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow(),
          makeRow({ id: 'bal-2', policy_id: 'pol-2', used_days: 0 }),
        ],
      });

      const results = await repo.findByEmployeeId('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 ORDER BY fiscal_year DESC, policy_id',
        ['emp-1'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('bal-1');
      expect(results[0].remainingDays).toBe(15);
      expect(results[1].id).toBe('bal-2');
      expect(results[1].remainingDays).toBe(20);
    });

    it('should filter by fiscalYear when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const results = await repo.findByEmployeeId('emp-1', 2026);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 ORDER BY fiscal_year DESC, policy_id',
        ['emp-1', 2026],
      );
      expect(results).toHaveLength(1);
    });

    it('should return an empty array when no balances exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByEmployeeId('emp-1');

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new leave balance and return it with computed remainingDays', async () => {
      const input = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 0,
        fiscalYear: 2026,
        status: 'ACTIVE' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'bal-new',
            employee_id: 'emp-1',
            policy_id: 'pol-1',
            total_entitlement: 20,
            used_days: 0,
            fiscal_year: 2026,
            status: 'ACTIVE',
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_balances (employee_id, policy_id, total_entitlement, used_days, fiscal_year, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
        ['emp-1', 'pol-1', 20, 0, 2026, 'ACTIVE'],
      );
      expect(result.id).toBe('bal-new');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
    });
  });

  describe('updateUsedDays', () => {
    it('should set used_days directly and return the updated balance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ used_days: 10, updated_at: '2026-08-01T00:00:00.000Z' })],
      });

      const result = await repo.updateUsedDays('bal-1', 10);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_balances SET used_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [10, 'bal-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(10);
      expect(result!.remainingDays).toBe(10);
    });

    it('should return null when the row does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateUsedDays('nonexistent', 5);

      expect(result).toBeNull();
    });
  });

  describe('incrementUsedDays', () => {
    it('should atomically increment used_days and return the updated balance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ used_days: 8, updated_at: '2026-08-01T00:00:00.000Z' })],
      });

      const result = await repo.incrementUsedDays('bal-1', 3);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_balances
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE id = $2 AND total_entitlement - used_days - $1 >= 0
       RETURNING *`,
        [3, 'bal-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(8);
      expect(result!.remainingDays).toBe(12);
    });

    it('should return null when the row does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.incrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });

    it('should throw InsufficientBalanceError when balance would go negative', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'bal-1', total_entitlement: 20, used_days: 18 }],
      });

      try {
        await repo.incrementUsedDays('bal-1', 5);
        fail('Expected incrementUsedDays to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(InsufficientBalanceError);
        expect((err as InsufficientBalanceError).message).toBe(
          'Insufficient balance: requested 5 day(s) but only 2 day(s) available',
        );
        expect((err as InsufficientBalanceError).balanceId).toBe('bal-1');
        expect((err as InsufficientBalanceError).requestedDays).toBe(5);
        expect((err as InsufficientBalanceError).availableDays).toBe(2);
      }
    });
  });

  describe('decrementUsedDays', () => {
    it('should atomically decrement used_days and return the updated balance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ used_days: 2, updated_at: '2026-08-01T00:00:00.000Z' })],
      });

      const result = await repo.decrementUsedDays('bal-1', 3);

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_balances
       SET used_days = used_days - $1, updated_at = NOW()
       WHERE id = $2 AND used_days - $1 >= 0
       RETURNING *`,
        [3, 'bal-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(2);
      expect(result!.remainingDays).toBe(18);
    });

    it('should return null when the row does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.decrementUsedDays('nonexistent', 3);

      expect(result).toBeNull();
    });

    it('should return null when decrement would make usedDays negative', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.decrementUsedDays('bal-1', 10);

      expect(result).toBeNull();
    });
  });
});
