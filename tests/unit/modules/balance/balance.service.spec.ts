
import { LeaveBalanceService, ILeaveBalanceService } from 'modules/balance';
import { ILeaveBalanceRepository } from 'modules/balance';
import { LeaveBalance } from 'modules/balance';
import { NotFoundError, ValidationError } from 'shared/error-types';

function createMockBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    leavePolicyId: 'lp-1',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('LeaveBalanceService', () => {
  let balanceService: ILeaveBalanceService;
  let mockRepository: jest.Mocked<ILeaveBalanceRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeAndFiscalYear: jest.fn(),
      findActiveByEmployee: jest.fn(),
      upsert: jest.fn(),
    };

    balanceService = new LeaveBalanceService(mockRepository);
  });

  describe('getBalance', () => {
    it('should return balance when found for the correct fiscal year', async () => {
      const balance = createMockBalance();
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await balanceService.getBalance('emp-1', 'lp-1', 2026);
      expect(result).toEqual(balance);
      expect(mockRepository.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-1', 'lp-1');
    });

    it('should throw NotFoundError when balance not found', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(
        balanceService.getBalance('emp-1', 'lp-1', 2026),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when balance exists but for a different fiscal year', async () => {
      const balance = createMockBalance({ fiscalYear: 2025 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(
        balanceService.getBalance('emp-1', 'lp-1', 2026),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getOrCreateBalance', () => {
    it('should return existing balance when it already exists for the same fiscal year', async () => {
      const balance = createMockBalance();
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await balanceService.getOrCreateBalance({
        employeeId: 'emp-1',
        leavePolicyId: 'lp-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      });

      expect(result).toEqual(balance);
      expect(mockRepository.upsert).not.toHaveBeenCalled();
    });

    it('should create a new balance when none exists', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      const newBalance = createMockBalance();
      mockRepository.upsert.mockResolvedValue(newBalance);

      const result = await balanceService.getOrCreateBalance({
        employeeId: 'emp-1',
        leavePolicyId: 'lp-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      });

      expect(result).toEqual(newBalance);
      expect(mockRepository.upsert).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        leavePolicyId: 'lp-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });

    it('should create a new balance when existing balance is for a different fiscal year', async () => {
      const oldBalance = createMockBalance({ fiscalYear: 2025 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(oldBalance);

      const newBalance = createMockBalance({ id: 'bal-2', fiscalYear: 2026 });
      mockRepository.upsert.mockResolvedValue(newBalance);

      const result = await balanceService.getOrCreateBalance({
        employeeId: 'emp-1',
        leavePolicyId: 'lp-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      });

      expect(result).toEqual(newBalance);
      expect(mockRepository.upsert).toHaveBeenCalled();
    });
  });

  describe('deductDays', () => {
    it('should deduct days using inclusive calendar day formula: (endDate - startDate) + 1', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 0, remainingDays: 20 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const updated = createMockBalance({ usedDays: 5, remainingDays: 15 });
      mockRepository.update.mockResolvedValue(updated);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-05');
      const result = await balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate);

      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
      expect(mockRepository.update).toHaveBeenCalledWith('bal-1', {
        usedDays: 5,
        remainingDays: 15,
      });
    });

    it('should handle single-day leave (startDate equals endDate)', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 0, remainingDays: 20 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const updated = createMockBalance({ usedDays: 1, remainingDays: 19 });
      mockRepository.update.mockResolvedValue(updated);

      const date = new Date('2026-06-01');
      const result = await balanceService.deductDays('emp-1', 'lp-1', 2026, date, date);

      expect(result.usedDays).toBe(1);
      expect(result.remainingDays).toBe(19);
    });

    it('should deduct exactly to zero remaining (exact boundary)', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 15, remainingDays: 5 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const updated = createMockBalance({ usedDays: 20, remainingDays: 0 });
      mockRepository.update.mockResolvedValue(updated);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-05');
      const result = await balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate);

      expect(result.usedDays).toBe(20);
      expect(result.remainingDays).toBe(0);
    });

    it('should throw ValidationError when insufficient balance', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 18, remainingDays: 2 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-05');

      await expect(
        balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate),
      ).rejects.toThrow(ValidationError);

      await expect(
        balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate),
      ).rejects.toThrow('Insufficient balance');
    });

    it('should throw ValidationError when balance is closed', async () => {
      const balance = createMockBalance({ status: 'CLOSED' });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-01');

      await expect(
        balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when endDate is before startDate', async () => {
      const balance = createMockBalance();
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const startDate = new Date('2026-06-05');
      const endDate = new Date('2026-06-01');

      await expect(
        balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when balance does not exist', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-05');

      await expect(
        balanceService.deductDays('emp-1', 'lp-1', 2026, startDate, endDate),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('restoreDays', () => {
    it('should restore days and recalculate remaining', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const updated = createMockBalance({ usedDays: 5, remainingDays: 15 });
      mockRepository.update.mockResolvedValue(updated);

      const result = await balanceService.restoreDays('emp-1', 'lp-1', 2026, 5);

      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
      expect(mockRepository.update).toHaveBeenCalledWith('bal-1', {
        usedDays: 5,
        remainingDays: 15,
      });
    });

    it('should not go below zero usedDays when restoring more than used', async () => {
      const balance = createMockBalance({ totalEntitlement: 20, usedDays: 3, remainingDays: 17 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const updated = createMockBalance({ usedDays: 0, remainingDays: 20 });
      mockRepository.update.mockResolvedValue(updated);

      const result = await balanceService.restoreDays('emp-1', 'lp-1', 2026, 10);

      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(20);
    });

    it('should throw ValidationError when days to restore is zero or negative', async () => {
      const balance = createMockBalance();
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(
        balanceService.restoreDays('emp-1', 'lp-1', 2026, 0),
      ).rejects.toThrow(ValidationError);

      await expect(
        balanceService.restoreDays('emp-1', 'lp-1', 2026, -1),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when balance does not exist', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(
        balanceService.restoreDays('emp-1', 'lp-1', 2026, 5),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRemainingDays', () => {
    it('should return remaining days for the correct fiscal year', async () => {
      const balance = createMockBalance({ remainingDays: 15 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await balanceService.getRemainingDays('emp-1', 'lp-1', 2026);
      expect(result).toBe(15);
    });

    it('should throw NotFoundError when balance is for a different fiscal year', async () => {
      const balance = createMockBalance({ fiscalYear: 2025 });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(
        balanceService.getRemainingDays('emp-1', 'lp-1', 2026),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('closeBalance', () => {
    it('should close an active balance', async () => {
      const balance = createMockBalance({ status: 'ACTIVE' });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const closed = createMockBalance({ status: 'CLOSED' });
      mockRepository.update.mockResolvedValue(closed);

      const result = await balanceService.closeBalance('emp-1', 'lp-1', 2026);

      expect(result.status).toBe('CLOSED');
      expect(mockRepository.update).toHaveBeenCalledWith('bal-1', { status: 'CLOSED' });
    });

    it('should return the balance unchanged if already closed', async () => {
      const balance = createMockBalance({ status: 'CLOSED' });
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await balanceService.closeBalance('emp-1', 'lp-1', 2026);

      expect(result.status).toBe('CLOSED');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when balance does not exist', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(
        balanceService.closeBalance('emp-1', 'lp-1', 2026),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('fiscal year scoping', () => {
    it('should scope balances by fiscal year — different years are independent', async () => {
      const balance2025 = createMockBalance({ id: 'bal-2025', fiscalYear: 2025, remainingDays: 5 });
      const balance2026 = createMockBalance({ id: 'bal-2026', fiscalYear: 2026, remainingDays: 20 });

      mockRepository.findByEmployeeAndPolicy
        .mockResolvedValueOnce(balance2025)
        .mockResolvedValueOnce(balance2026);

      const result2025 = await balanceService.getRemainingDays('emp-1', 'lp-1', 2025);
      const result2026 = await balanceService.getRemainingDays('emp-1', 'lp-1', 2026);

      expect(result2025).toBe(5);
      expect(result2026).toBe(20);
    });

    it('should throw NotFoundError when querying a fiscal year with no balance', async () => {
      mockRepository.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(
        balanceService.getRemainingDays('emp-1', 'lp-1', 2027),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
