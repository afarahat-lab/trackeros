import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType } from '../../../../src/shared/types/leave.types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('LeaveBalanceRepository', () => {
  let repository: LeaveBalanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new LeaveBalanceRepository(mockPool);
  });

  describe('findByEmployeeAndType', () => {
    it('should return a balance when found', async () => {
      const mockBalance = { id: '1', employeeId: 'emp1', leaveType: LeaveType.ANNUAL, balance: 10, fiscalYear: 2023 };
      mockPool.query.mockResolvedValue({ rows: [mockBalance] } as any);

      const result = await repository.findByEmployeeAndType('emp1', LeaveType.ANNUAL, 2023);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type = $2 AND fiscal_year = $3',
        ['emp1', LeaveType.ANNUAL, 2023]
      );
      expect(result).toEqual(mockBalance);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);
      const result = await repository.findByEmployeeAndType('emp1', LeaveType.SICK, 2023);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a balance', async () => {
      const dto = { employeeId: 'emp1', leaveType: LeaveType.ANNUAL, balance: 20, fiscalYear: 2023 };
      const mockBalance = { id: '1', ...dto };
      mockPool.query.mockResolvedValue({ rows: [mockBalance] } as any);

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_balances'),
        [dto.employeeId, dto.leaveType, dto.balance, dto.fiscalYear]
      );
      expect(result).toEqual(mockBalance);
    });
  });

  describe('decrementBalance', () => {
    it('should decrement and return the balance', async () => {
      const mockBalance = { id: '1', balance: 15 };
      mockPool.query.mockResolvedValue({ rows: [mockBalance] } as any);

      const result = await repository.decrementBalance('1', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        [5, '1']
      );
      expect(result).toEqual(mockBalance);
    });
  });
});
