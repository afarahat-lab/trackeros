import { LeaveBalanceRepository } from '../../../../src/modules/leave/leave-balance.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveBalance, CreateLeaveBalanceDto } from '../../../../src/modules/leave/leave-balance.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'lb-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    policyId: 'lp-1',
    entitlementDays: 20,
    usedDays: 5,
    pendingDays: 2,
    accruedDays: 15,
    carriedForwardDays: 3,
    expiresAt: new Date('2026-12-31T00:00:00Z'),
    year: 2026,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-06-15T00:00:00Z'),
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateLeaveBalanceDto> = {}): CreateLeaveBalanceDto {
  return {
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    policyId: 'lp-1',
    entitlementDays: 20,
    year: 2026,
    ...overrides,
  };
}

describe('LeaveBalanceRepository', () => {
  let repo: LeaveBalanceRepository;

  beforeEach(() => {
    repo = new LeaveBalanceRepository();
    mockQuery.mockReset();
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee', async () => {
      const balances = [makeLeaveBalance(), makeLeaveBalance({ id: 'lb-2', leaveTypeId: 'lt-2', entitlementDays: 10 })];
      mockQuery.mockResolvedValueOnce({ rows: balances });

      const result = await repo.findByEmployeeId('emp-1');

      expect(result).toEqual(balances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND deleted_at IS NULL ORDER BY year DESC, leave_type_id',
        ['emp-1']
      );
    });

    it('should return empty array when employee has no balances', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndLeaveTypeId', () => {
    it('should return a balance when found', async () => {
      const balance = makeLeaveBalance();
      mockQuery.mockResolvedValueOnce({ rows: [balance] });

      const result = await repo.findByEmployeeIdAndLeaveTypeId('emp-1', 'lt-1');

      expect(result).toEqual(balance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND deleted_at IS NULL',
        ['emp-1', 'lt-1']
      );
    });

    it('should return null when balance is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndLeaveTypeId('emp-1', 'lt-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeIdAndYear', () => {
    it('should return balances for an employee in a given year', async () => {
      const balances = [makeLeaveBalance(), makeLeaveBalance({ id: 'lb-2', leaveTypeId: 'lt-2', entitlementDays: 10 })];
      mockQuery.mockResolvedValueOnce({ rows: balances });

      const result = await repo.findByEmployeeIdAndYear('emp-1', 2026);

      expect(result).toEqual(balances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND deleted_at IS NULL ORDER BY leave_type_id',
        ['emp-1', 2026]
      );
    });

    it('should return empty array when no balances exist for the year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeIdAndYear('emp-1', 2020);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave balance and return it', async () => {
      const dto = makeCreateDto();
      const created = makeLeaveBalance();
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [dto.employeeId, dto.leaveTypeId, dto.policyId, dto.entitlementDays, 0, 0, 0, 0, null, dto.year]
      );
    });

    it('should use provided optional fields when specified', async () => {
      const dto = makeCreateDto({
        usedDays: 3,
        pendingDays: 1,
        accruedDays: 10,
        carriedForwardDays: 5,
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      });
      const created = makeLeaveBalance({
        usedDays: 3,
        pendingDays: 1,
        accruedDays: 10,
        carriedForwardDays: 5,
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result.usedDays).toBe(3);
      expect(result.pendingDays).toBe(1);
      expect(result.accruedDays).toBe(10);
      expect(result.carriedForwardDays).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        expect.arrayContaining([3, 1, 10, 5])
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated balance', async () => {
      const updated = makeLeaveBalance({ usedDays: 8, pendingDays: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('lb-1', { usedDays: 8, pendingDays: 0 });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        expect.arrayContaining([8, 0, 'lb-1'])
      );
    });

    it('should return null when balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { usedDays: 5 });

      expect(result).toBeNull();
    });

    it('should return existing balance when no fields are provided', async () => {
      const existing = makeLeaveBalance();
      mockQuery.mockResolvedValueOnce({ rows: [existing] });

      const result = await repo.update('lb-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1 AND deleted_at IS NULL',
        ['lb-1']
      );
    });

    it('should handle expiresAt update including null', async () => {
      const updated = makeLeaveBalance({ expiresAt: null });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      await repo.update('lb-1', { expiresAt: null });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances SET'),
        expect.arrayContaining([null, 'lb-1'])
      );
    });
  });

  describe('upsert', () => {
    it('should create a new balance when none exists', async () => {
      const dto = makeCreateDto();
      const created = makeLeaveBalance();
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.upsert(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND deleted_at IS NULL',
        ['emp-1', 'lt-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO leave_balances'),
        expect.any(Array)
      );
    });

    it('should update an existing balance when one exists', async () => {
      const dto = makeCreateDto({ usedDays: 10 });
      const existing = makeLeaveBalance();
      const updated = makeLeaveBalance({ usedDays: 10 });
      mockQuery.mockResolvedValueOnce({ rows: [existing] });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.upsert(dto);

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND deleted_at IS NULL',
        ['emp-1', 'lt-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE leave_balances SET'),
        expect.any(Array)
      );
    });
  });
});
