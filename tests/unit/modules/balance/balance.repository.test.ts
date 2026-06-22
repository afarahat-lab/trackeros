import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { CreateLeaveBalanceDto } from '../../../../src/modules/balance/balance.model';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockPool = pool as unknown as { query: jest.Mock };

describe('LeaveBalanceRepository', () => {
  let repository: LeaveBalanceRepository;

  beforeEach(() => {
    repository = new LeaveBalanceRepository();
    jest.clearAllMocks();
  });

  const mockDbRow = {
    id: 'test-id',
    employee_id: 'emp-1',
    leave_type_id: 'lt-1',
    year: 2024,
    total_days: 20,
    used_days: 5,
    remaining_days: 15,
  };

  const mockLeaveBalance = {
    id: 'test-id',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    year: 2024,
    totalDays: 20,
    usedDays: 5,
    remainingDays: 15,
  };

  describe('findById', () => {
    it('should return a LeaveBalance when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      const result = await repository.findById('test-id');
      expect(result).toEqual(mockLeaveBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE id = $1',
        ['test-id']
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeAndYear', () => {
    it('should return an array of LeaveBalance', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      const result = await repository.findByEmployeeAndYear('emp-1', 2024);
      expect(result).toEqual([mockLeaveBalance]);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
        ['emp-1', 2024]
      );
    });

    it('should return empty array when no balances found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByEmployeeAndYear('emp-1', 2024);
      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeLeaveTypeAndYear', () => {
    it('should return a LeaveBalance when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      const result = await repository.findByEmployeeLeaveTypeAndYear('emp-1', 'lt-1', 2024);
      expect(result).toEqual(mockLeaveBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
        ['emp-1', 'lt-1', 2024]
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByEmployeeLeaveTypeAndYear('emp-1', 'lt-1', 2024);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a LeaveBalance', async () => {
      const dto: CreateLeaveBalanceDto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        year: 2024,
        totalDays: 20,
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      const result = await repository.create(dto);
      expect(result).toEqual(mockLeaveBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['emp-1', 'lt-1', 2024, 20, 0]
      );
    });

    it('should use provided usedDays when specified', async () => {
      const dto: CreateLeaveBalanceDto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        year: 2024,
        totalDays: 20,
        usedDays: 3,
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      await repository.create(dto);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['emp-1', 'lt-1', 2024, 20, 3]
      );
    });
  });

  describe('updateUsedDays', () => {
    it('should update used days and return updated LeaveBalance', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockDbRow] });
      const result = await repository.updateUsedDays('test-id', 5);
      expect(result).toEqual(mockLeaveBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE leave_balances SET used_days = $1 WHERE id = $2 RETURNING *',
        [5, 'test-id']
      );
    });
  });
});
