import {
  BalanceService,
  InsufficientBalanceError,
} from 'modules/balance/balance.service';
import { IBalanceRepository } from 'modules/balance/balance.repository';
import { LeaveBalance, BalanceStatus } from 'modules/balance/balance.model';

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2025,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('BalanceService', () => {
  let service: BalanceService;
  let mockRepo: jest.Mocked<IBalanceRepository>;

  beforeEach(() => {
    mockRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployee: jest.fn(),
      create: jest.fn(),
      incrementUsedDays: jest.fn(),
      decrementUsedDays: jest.fn(),
    };
    service = new BalanceService(mockRepo);
  });

  describe('getBalance', () => {
    it('returns the balance when found', async () => {
      const balance = makeLeaveBalance();
      mockRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-1', 'pol-1', 2025);

      expect(result).toEqual(balance);
      expect(mockRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith(
        'emp-1',
        'pol-1',
        2025,
      );
    });

    it('returns null when no balance exists', async () => {
      mockRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      const result = await service.getBalance('emp-1', 'pol-1', 2025);

      expect(result).toBeNull();
    });
  });

  describe('getBalances', () => {
    it('returns all balances for an employee in a fiscal year', async () => {
      const balances = [
        makeLeaveBalance({ id: 'bal-1', policyId: 'pol-1' }),
        makeLeaveBalance({ id: 'bal-2', policyId: 'pol-2' }),
      ];
      mockRepo.findByEmployee.mockResolvedValueOnce(balances);

      const result = await service.getBalances('emp-1', 2025);

      expect(result).toEqual(balances);
      expect(mockRepo.findByEmployee).toHaveBeenCalledWith('emp-1', 2025);
    });

    it('returns empty array when no balances exist', async () => {
      mockRepo.findByEmployee.mockResolvedValueOnce([]);

      const result = await service.getBalances('emp-1', 2025);

      expect(result).toEqual([]);
    });
  });

  describe('initializeBalance', () => {
    it('creates a balance with usedDays=0 and ACTIVE status', async () => {
      const created = makeLeaveBalance({ usedDays: 0, remainingDays: 20 });
      mockRepo.create.mockResolvedValueOnce(created);

      const result = await service.initializeBalance('emp-1', 'pol-1', 20, 2025);

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.employeeId).toBe('emp-1');
      expect(callArg.policyId).toBe('pol-1');
      expect(callArg.totalEntitlement).toBe(20);
      expect(callArg.usedDays).toBe(0);
      expect(callArg.fiscalYear).toBe(2025);
      expect(callArg.status).toBe(BalanceStatus.ACTIVE);
      expect(callArg.id).toBeDefined();
      expect(typeof callArg.id).toBe('string');
      expect(callArg.id.length).toBeGreaterThan(0);
    });

    it('generates unique ids for each initialization', async () => {
      const created1 = makeLeaveBalance({ id: 'uuid-1', usedDays: 0, remainingDays: 20 });
      const created2 = makeLeaveBalance({ id: 'uuid-2', usedDays: 0, remainingDays: 15 });
      mockRepo.create.mockResolvedValueOnce(created1);
      mockRepo.create.mockResolvedValueOnce(created2);

      await service.initializeBalance('emp-1', 'pol-1', 20, 2025);
      await service.initializeBalance('emp-1', 'pol-2', 15, 2025);

      const id1 = mockRepo.create.mock.calls[0][0].id;
      const id2 = mockRepo.create.mock.calls[1][0].id;
      expect(id1).not.toBe(id2);
    });
  });

  describe('deductDays', () => {
    it('increments usedDays and returns the updated balance', async () => {
      const afterDeduction = makeLeaveBalance({
        usedDays: 8,
        remainingDays: 12,
      });
      mockRepo.incrementUsedDays.mockResolvedValueOnce(afterDeduction);

      const result = await service.deductDays('bal-1', 3);

      expect(result).toEqual(afterDeduction);
      expect(mockRepo.incrementUsedDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('throws InsufficientBalanceError and rolls back when remaining would go below zero', async () => {
      const afterDeduction = makeLeaveBalance({
        usedDays: 22,
        remainingDays: -2,
      });
      mockRepo.incrementUsedDays.mockResolvedValueOnce(afterDeduction);
      mockRepo.decrementUsedDays.mockResolvedValueOnce(
        makeLeaveBalance({ usedDays: 5, remainingDays: 15 }),
      );

      const error = await service.deductDays('bal-1', 17).catch((e) => e);
      expect(error).toBeInstanceOf(InsufficientBalanceError);
      expect((error as InsufficientBalanceError).message).toBe(
        'Insufficient balance: requested 17 days but only 15 remaining',
      );
      expect((error as InsufficientBalanceError).balanceId).toBe('bal-1');
      expect((error as InsufficientBalanceError).requested).toBe(17);
      expect((error as InsufficientBalanceError).remaining).toBe(15);

      expect(mockRepo.incrementUsedDays).toHaveBeenCalledWith('bal-1', 17);
      expect(mockRepo.decrementUsedDays).toHaveBeenCalledWith('bal-1', 17);
    });

    it('throws when balance is not found', async () => {
      mockRepo.incrementUsedDays.mockResolvedValueOnce(null);

      await expect(service.deductDays('bal-1', 3)).rejects.toThrow(
        'Balance not found: bal-1',
      );
    });

    it('allows deduction that results in exactly zero remaining', async () => {
      const afterDeduction = makeLeaveBalance({
        usedDays: 20,
        remainingDays: 0,
      });
      mockRepo.incrementUsedDays.mockResolvedValueOnce(afterDeduction);

      const result = await service.deductDays('bal-1', 15);

      expect(result.remainingDays).toBe(0);
    });
  });

  describe('restoreDays', () => {
    it('decrements usedDays and returns the updated balance', async () => {
      const afterRestore = makeLeaveBalance({
        usedDays: 2,
        remainingDays: 18,
      });
      mockRepo.decrementUsedDays.mockResolvedValueOnce(afterRestore);

      const result = await service.restoreDays('bal-1', 3);

      expect(result).toEqual(afterRestore);
      expect(mockRepo.decrementUsedDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('throws when decrement fails due to insufficient used days', async () => {
      mockRepo.decrementUsedDays.mockResolvedValueOnce(null);

      await expect(service.restoreDays('bal-1', 10)).rejects.toThrow(
        'Cannot restore 10 days for balance bal-1: insufficient used days or balance not found',
      );
    });
  });
});
