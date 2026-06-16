import { Pool } from 'pg';
import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance, CreateLeaveBalanceDto, UpdateLeaveBalanceDto } from '../../../../src/modules/balance/balance.model';

describe('LeaveBalanceRepository', () => {
  let mockQuery: jest.Mock;
  let mockPool: Pool;
  let repository: LeaveBalanceRepository;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = { query: mockQuery } as unknown as Pool;
    repository = new LeaveBalanceRepository(mockPool);
  });

  const sampleBalance: LeaveBalance = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    balanceDays: 20,
    fiscalYear: 2025,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const createDto: CreateLeaveBalanceDto = {
    employeeId: 'emp-1',
    policyId: 'pol-1',
    balanceDays: 20,
    fiscalYear: 2025,
  };

  const updateDto: UpdateLeaveBalanceDto = {
    balanceDays: 15,
  };

  describe('create', () => {
    it('should insert a new leave balance and return it', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleBalance] });

      const result = await repository.create(createDto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [createDto.employeeId, createDto.policyId, createDto.balanceDays, createDto.fiscalYear]
      );
      expect(result).toEqual(sampleBalance);
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.create(createDto)).rejects.toThrow(
        `Failed to create leave balance: ${dbError.message}`
      );
    });
  });

  describe('findById', () => {
    it('should return a leave balance when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleBalance] });

      const result = await repository.findById(sampleBalance.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sampleBalance.id]
      );
      expect(result).toEqual(sampleBalance);
    });

    it('should return null when no balance is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('timeout');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findById(sampleBalance.id)).rejects.toThrow(
        `Failed to find leave balance by id: ${dbError.message}`
      );
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a leave balance for the given employee, policy, and fiscal year', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleBalance] });

      const result = await repository.findByEmployeeAndPolicy(
        sampleBalance.employeeId,
        sampleBalance.policyId,
        sampleBalance.fiscalYear
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3'),
        [sampleBalance.employeeId, sampleBalance.policyId, sampleBalance.fiscalYear]
      );
      expect(result).toEqual(sampleBalance);
    });

    it('should return null when no matching balance exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeAndPolicy('emp-2', 'pol-2', 2025);

      expect(result).toBeNull();
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('syntax error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.findByEmployeeAndPolicy('emp-1', 'pol-1', 2025)
      ).rejects.toThrow(`Failed to find leave balance by employee and policy: ${dbError.message}`);
    });
  });

  describe('findByEmployee', () => {
    it('should return all balances for an employee in a fiscal year', async () => {
      const balances = [sampleBalance];
      mockQuery.mockResolvedValueOnce({ rows: balances });

      const result = await repository.findByEmployee(sampleBalance.employeeId, sampleBalance.fiscalYear);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1 AND fiscal_year = $2'),
        [sampleBalance.employeeId, sampleBalance.fiscalYear]
      );
      expect(result).toEqual(balances);
    });

    it('should return an empty array when no balances exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployee('emp-2', 2025);

      expect(result).toEqual([]);
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('disk full');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findByEmployee('emp-1', 2025)).rejects.toThrow(
        `Failed to find leave balances by employee: ${dbError.message}`
      );
    });
  });

  describe('update', () => {
    it('should update the balance days and return the updated record', async () => {
      const updatedBalance = { ...sampleBalance, balanceDays: 15, updatedAt: new Date('2025-06-01T00:00:00.000Z') };
      mockQuery.mockResolvedValueOnce({ rows: [updatedBalance] });

      const result = await repository.update(sampleBalance.id, updateDto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [updateDto.balanceDays, sampleBalance.id]
      );
      expect(result).toEqual(updatedBalance);
    });

    it('should throw an error when the balance does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('non-existent-id', updateDto)).rejects.toThrow(
        'Leave balance with id non-existent-id not found'
      );
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('constraint violation');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.update(sampleBalance.id, updateDto)).rejects.toThrow(
        `Failed to update leave balance: ${dbError.message}`
      );
    });
  });

  describe('delete', () => {
    it('should delete the balance and return true when a row is removed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: sampleBalance.id }], rowCount: 1 });

      const result = await repository.delete(sampleBalance.id);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM leave_balances'),
        [sampleBalance.id]
      );
      expect(result).toBe(true);
    });

    it('should return false when no row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should throw an error when the query fails', async () => {
      const dbError = new Error('permission denied');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.delete(sampleBalance.id)).rejects.toThrow(
        `Failed to delete leave balance: ${dbError.message}`
      );
    });
  });
});
