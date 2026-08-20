import { BalanceService } from '../../../../src/modules/balance/balance.service';
import {
  Balance,
  BalanceNotFoundError,
  IBalanceRepository,
  InsufficientBalanceError,
} from '../../../../src/modules/balance/balance.model';
import { BalanceStatus } from '../../../../src/shared/types';

function makeBalance(overrides: Partial<Balance> = {}): Balance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    leaveType: 'annual',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: BalanceStatus.active,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<IBalanceRepository> {
  return {
    findByEmployeeId: jest.fn(),
    findByEmployeeIdAndLeaveType: jest.fn(),
    findByEmployeeIdAndFiscalYear: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deductDays: jest.fn(),
  };
}

describe('BalanceService', () => {
  let service: BalanceService;
  let mockRepo: jest.Mocked<IBalanceRepository>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new BalanceService(mockRepo);
  });

  describe('getBalance', () => {
    it('should delegate to repository.findByEmployeeIdAndLeaveType', async () => {
      const balance = makeBalance();
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-1', 'annual');

      expect(result).toEqual(balance);
      expect(mockRepo.findByEmployeeIdAndLeaveType).toHaveBeenCalledWith(
        'emp-1',
        'annual',
      );
    });

    it('should return null when repository returns null', async () => {
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(null);

      const result = await service.getBalance('emp-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getBalances', () => {
    it('should delegate to repository.findByEmployeeId', async () => {
      const balances = [makeBalance(), makeBalance({ id: 'bal-2', leaveType: 'sick' })];
      mockRepo.findByEmployeeId.mockResolvedValueOnce(balances);

      const result = await service.getBalances('emp-1');

      expect(result).toEqual(balances);
      expect(mockRepo.findByEmployeeId).toHaveBeenCalledWith('emp-1');
    });

    it('should return empty array when no balances exist', async () => {
      mockRepo.findByEmployeeId.mockResolvedValueOnce([]);

      const result = await service.getBalances('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when remainingDays >= requestedDays', async () => {
      const balance = makeBalance({ remainingDays: 15 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);

      const result = await service.hasSufficientBalance('emp-1', 'annual', 10);

      expect(result).toBe(true);
    });

    it('should return true when remainingDays equals requestedDays exactly', async () => {
      const balance = makeBalance({ remainingDays: 15 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);

      const result = await service.hasSufficientBalance('emp-1', 'annual', 15);

      expect(result).toBe(true);
    });

    it('should return false when remainingDays < requestedDays', async () => {
      const balance = makeBalance({ remainingDays: 5 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);

      const result = await service.hasSufficientBalance('emp-1', 'annual', 10);

      expect(result).toBe(false);
    });

    it('should return false when balance does not exist', async () => {
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(null);

      const result = await service.hasSufficientBalance(
        'emp-1',
        'nonexistent',
        5,
      );

      expect(result).toBe(false);
    });
  });

  describe('deductBalance', () => {
    it('should deduct days and return updated balance', async () => {
      const balance = makeBalance({ remainingDays: 15 });
      const updated = makeBalance({ remainingDays: 10, usedDays: 10 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);
      mockRepo.deductDays.mockResolvedValueOnce(updated);

      const result = await service.deductBalance('emp-1', 'annual', 5);

      expect(result).toEqual(updated);
      expect(mockRepo.deductDays).toHaveBeenCalledWith('bal-1', 5);
    });

    it('should throw BalanceNotFoundError when balance does not exist', async () => {
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(null);

      await expect(
        service.deductBalance('emp-1', 'nonexistent', 5),
      ).rejects.toThrow(BalanceNotFoundError);
    });

    it('should throw InsufficientBalanceError when remainingDays < days', async () => {
      const balance = makeBalance({ remainingDays: 3 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);

      await expect(
        service.deductBalance('emp-1', 'annual', 10),
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw BalanceNotFoundError when deductDays returns null', async () => {
      const balance = makeBalance({ remainingDays: 15 });
      mockRepo.findByEmployeeIdAndLeaveType.mockResolvedValueOnce(balance);
      mockRepo.deductDays.mockResolvedValueOnce(null);

      await expect(
        service.deductBalance('emp-1', 'annual', 5),
      ).rejects.toThrow(BalanceNotFoundError);
    });
  });
});
