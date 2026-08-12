import { LeaveBalanceRepository, LeaveBalance } from '../../../../src/modules/balance';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function mockQueryResult<T>(rows: T[]): { rows: T[] } {
  return { rows };
}

describe('LeaveBalanceRepository', () => {
  let repository: LeaveBalanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new LeaveBalanceRepository();
  });

  describe('findById', () => {
    it('should return LeaveBalance when a row matches the id', async () => {
      const mockRow = {
        id: 'bal-1',
        employee_id: 'emp-1',
        policy_id: 'pol-1',
        fiscal_year: 2026,
        total_entitlement: 20,
        used_days: 3,
        remaining_days: 17,
        status: 'ACTIVE' as const,
        created_at: new Date('2026-01-01T08:00:00Z'),
        updated_at: new Date('2026-06-15T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce(mockQueryResult([mockRow]));

      const result = await repository.findById('bal-1');

      expect(result).not.toBeNull();
      expect(result).toEqual<LeaveBalance>({
        id: 'bal-1',
        employeeId: 'emp-1',
        policyId: 'pol-1',
        fiscalYear: 2026,
        totalEntitlement: 20,
        usedDays: 3,
        remainingDays: 17,
        status: 'ACTIVE',
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['bal-1'],
      );
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return LeaveBalance when a row matches the composite key', async () => {
      const mockRow = {
        id: 'bal-2',
        employee_id: 'emp-1',
        policy_id: 'pol-2',
        fiscal_year: 2026,
        total_entitlement: 10,
        used_days: 0,
        remaining_days: 10,
        status: 'ACTIVE' as const,
        created_at: new Date('2026-01-01T08:00:00Z'),
        updated_at: new Date('2026-01-01T08:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce(mockQueryResult([mockRow]));

      const result = await repository.findByEmployeeAndPolicy('emp-1', 'pol-2', 2026);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-2');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.policyId).toBe('pol-2');
      expect(result!.fiscalYear).toBe(2026);
      expect(result!.totalEntitlement).toBe(10);
      expect(result!.usedDays).toBe(0);
      expect(result!.remainingDays).toBe(10);
      expect(result!.status).toBe('ACTIVE');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3',
        ['emp-1', 'pol-2', 2026],
      );
    });

    it('should return null when no row matches the composite key', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findByEmployeeAndPolicy('emp-1', 'pol-99', 2026);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployee', () => {
    it('should return all balances for an employee in a fiscal year', async () => {
      const mockRows = [
        {
          id: 'bal-1',
          employee_id: 'emp-1',
          policy_id: 'pol-1',
          fiscal_year: 2026,
          total_entitlement: 20,
          used_days: 3,
          remaining_days: 17,
          status: 'ACTIVE' as const,
          created_at: new Date('2026-01-01T08:00:00Z'),
          updated_at: new Date('2026-06-15T12:00:00Z'),
        },
        {
          id: 'bal-2',
          employee_id: 'emp-1',
          policy_id: 'pol-2',
          fiscal_year: 2026,
          total_entitlement: 10,
          used_days: 0,
          remaining_days: 10,
          status: 'ACTIVE' as const,
          created_at: new Date('2026-01-01T08:00:00Z'),
          updated_at: new Date('2026-01-01T08:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce(mockQueryResult(mockRows));

      const result = await repository.findByEmployee('emp-1', 2026);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-1');
      expect(result[1].id).toBe('bal-2');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        ['emp-1', 2026],
      );
    });

    it('should return empty array when no balances exist for the employee', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findByEmployee('emp-1', 2026);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a new balance with system-generated fields', async () => {
      const input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        fiscalYear: 2026,
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        status: 'ACTIVE',
      };

      const insertedRow = {
        id: 'generated-id',
        employee_id: 'emp-1',
        policy_id: 'pol-1',
        fiscal_year: 2026,
        total_entitlement: 20,
        used_days: 0,
        remaining_days: 20,
        status: 'ACTIVE' as const,
        created_at: new Date('2026-01-01T08:00:00Z'),
        updated_at: new Date('2026-01-01T08:00:00Z'),
      };

      // First call: INSERT (no rows returned), second call: SELECT
      mockQuery
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([insertedRow]));

      const result = await repository.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.employeeId).toBe('emp-1');
      expect(result.policyId).toBe('pol-1');
      expect(result.fiscalYear).toBe(2026);
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.status).toBe('ACTIVE');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify the INSERT was called with parameterized query
      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO leave_balances');
      expect(insertCall[1]).toHaveLength(10);
      expect(insertCall[1][1]).toBe('emp-1');
      expect(insertCall[1][2]).toBe('pol-1');
      expect(insertCall[1][3]).toBe(2026);
      expect(insertCall[1][4]).toBe(20);
      expect(insertCall[1][5]).toBe(0);
      expect(insertCall[1][6]).toBe(20);
      expect(insertCall[1][7]).toBe('ACTIVE');

      // Verify the SELECT re-reads the inserted row using the same generated id
      const insertCallArgs = mockQuery.mock.calls[0][1] as unknown[];
      const generatedId = insertCallArgs[0] as string;
      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[0]).toBe('SELECT * FROM leave_balances WHERE id = $1');
      expect(selectCall[1]).toEqual([generatedId]);
    });
  });

  describe('update', () => {
    it('should update only supplied fields and return the updated balance', async () => {
      const updatedRow = {
        id: 'bal-1',
        employee_id: 'emp-1',
        policy_id: 'pol-1',
        fiscal_year: 2026,
        total_entitlement: 20,
        used_days: 5,
        remaining_days: 15,
        status: 'ACTIVE' as const,
        created_at: new Date('2026-01-01T08:00:00Z'),
        updated_at: new Date('2026-07-01T10:00:00Z'),
      };

      // First call: UPDATE (no rows returned), second call: SELECT
      mockQuery
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([updatedRow]));

      const result = await repository.update('bal-1', {
        usedDays: 5,
        remainingDays: 15,
      });

      expect(result.id).toBe('bal-1');
      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
      expect(result.status).toBe('ACTIVE');

      // Verify the UPDATE was called with parameterized query
      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE leave_balances SET');
      expect(updateCall[0]).toContain('used_days = $1');
      expect(updateCall[0]).toContain('remaining_days = $2');
      expect(updateCall[0]).toContain('updated_at = $3');
      expect(updateCall[0]).toContain('WHERE id = $4');

      // Verify the SELECT re-reads the updated row
      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[0]).toBe('SELECT * FROM leave_balances WHERE id = $1');
      expect(selectCall[1]).toEqual(['bal-1']);
    });

    it('should update status field when provided', async () => {
      const updatedRow = {
        id: 'bal-1',
        employee_id: 'emp-1',
        policy_id: 'pol-1',
        fiscal_year: 2026,
        total_entitlement: 20,
        used_days: 20,
        remaining_days: 0,
        status: 'EXHAUSTED' as const,
        created_at: new Date('2026-01-01T08:00:00Z'),
        updated_at: new Date('2026-12-15T10:00:00Z'),
      };

      mockQuery
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([updatedRow]));

      const result = await repository.update('bal-1', { status: 'EXHAUSTED' });

      expect(result.status).toBe('EXHAUSTED');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('status = $1');
      expect(updateCall[1][0]).toBe('EXHAUSTED');
    });
  });
});
