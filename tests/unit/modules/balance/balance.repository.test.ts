import { PgLeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';

// Mock the pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
    connect: (...args: any[]) => mockConnect(...args),
  },
}));

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PgLeaveBalanceRepository();
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return a balance when found', async () => {
      const mockBalance = { id: '1', employee_id: 'emp1', policy_id: 'pol1', fiscal_year: 2024, remaining_days: 10 };
      mockQuery.mockResolvedValue({ rows: [mockBalance] });

      const result = await repo.findByEmployeeAndPolicy('emp1', 'pol1', 2024);

      expect(result).toEqual(mockBalance);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3 AND deleted_at IS NULL',
        ['emp1', 'pol1', 2024]
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByEmployeeAndPolicy('emp1', 'pol1', 2024);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployee', () => {
    it('should return all balances for an employee', async () => {
      const mockBalances = [
        { id: '1', employee_id: 'emp1', policy_id: 'pol1', fiscal_year: 2024, remaining_days: 10 },
        { id: '2', employee_id: 'emp1', policy_id: 'pol2', fiscal_year: 2024, remaining_days: 5 },
      ];
      mockQuery.mockResolvedValue({ rows: mockBalances });

      const result = await repo.findByEmployee('emp1');

      expect(result).toEqual(mockBalances);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND deleted_at IS NULL',
        ['emp1']
      );
    });

    it('should return empty array when no balances found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByEmployee('emp1');

      expect(result).toEqual([]);
    });
  });

  describe('deductDays', () => {
    const mockClient = {
      query: jest.fn(),
      release: mockRelease,
    };

    beforeEach(() => {
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should deduct days successfully', async () => {
      const balance = { id: '1', remaining_days: 10, used_days: 5 };
      const updated = { id: '1', remaining_days: 7, used_days: 8 };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [balance] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE
        .mockResolvedValueOnce(undefined) // INSERT audit
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.deductDays('1', 3);

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error if balance not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE - empty
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.deductDays('1', 3)).rejects.toThrow('Balance not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error if insufficient balance', async () => {
      const balance = { id: '1', remaining_days: 2, used_days: 5 };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [balance] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.deductDays('1', 3)).rejects.toThrow('Insufficient balance');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback on unexpected error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // SELECT FOR UPDATE fails

      await expect(repo.deductDays('1', 3)).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('restoreDays', () => {
    const mockClient = {
      query: jest.fn(),
      release: mockRelease,
    };

    beforeEach(() => {
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should restore days successfully', async () => {
      const balance = { id: '1', remaining_days: 5, used_days: 10 };
      const updated = { id: '1', remaining_days: 8, used_days: 7 };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [balance] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [updated] }) // UPDATE
        .mockResolvedValueOnce(undefined) // INSERT audit
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.restoreDays('1', 3);

      expect(result).toEqual(updated);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error if balance not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE - empty
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.restoreDays('1', 3)).rejects.toThrow('Balance not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback on unexpected error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // SELECT FOR UPDATE fails

      await expect(repo.restoreDays('1', 3)).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
