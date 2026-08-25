import { BalanceService } from 'modules/balance/balance.service';
import { IBalanceRepository } from 'modules/balance/balance.repository.interface';
import { LeaveBalance } from 'modules/balance/balance.model';

const makeLeaveBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: 'balance-1',
  employeeId: 'emp-1',
  policyId: 'policy-annual',
  entitlementDays: 20,
  usedDays: 0,
  pendingDays: 0,
  year: 2026,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('BalanceService', () => {
  let mockRepo: jest.Mocked<IBalanceRepository>;
  let service: BalanceService;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmployeeAndYear: jest.fn(),
      findByEmployeePolicyAndYear: jest.fn(),
      create: jest.fn(),
      updateCounters: jest.fn(),
      getOrCreateForYear: jest.fn(),
    };
    service = new BalanceService(mockRepo);
  });

  describe('getOrCreateBalance', () => {
    it('should delegate to repository getOrCreateForYear', async () => {
      const balance = makeLeaveBalance();
      mockRepo.getOrCreateForYear.mockResolvedValue(balance);

      const result = await service.getOrCreateBalance('emp-1', 'policy-annual', 2026, 20);

      expect(result).toEqual(balance);
      expect(mockRepo.getOrCreateForYear).toHaveBeenCalledWith('emp-1', 'policy-annual', 2026, 20);
    });
  });

  describe('getAvailableDays', () => {
    it('should compute entitlementDays - usedDays - pendingDays', async () => {
      const balance = makeLeaveBalance({ entitlementDays: 20, usedDays: 3, pendingDays: 2 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);

      const result = await service.getAvailableDays('emp-1', 'policy-annual', 2026);

      expect(result).toBe(15);
      expect(mockRepo.findByEmployeePolicyAndYear).toHaveBeenCalledWith('emp-1', 'policy-annual', 2026);
      expect(mockRepo.updateCounters).not.toHaveBeenCalled();
    });

    it('should return 0 when no balance exists', async () => {
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(null);

      const result = await service.getAvailableDays('emp-1', 'policy-annual', 2026);

      expect(result).toBe(0);
    });
  });

  describe('hasSufficientBalance', () => {
    const setupBalance = () => {
      const balance = makeLeaveBalance({ entitlementDays: 20, usedDays: 3, pendingDays: 2 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);
    };

    it('should return true when requestedDays < availableDays', async () => {
      setupBalance();
      await expect(service.hasSufficientBalance('emp-1', 'policy-annual', 2026, 10)).resolves.toBe(true);
    });

    it('should return false when requestedDays > availableDays', async () => {
      setupBalance();
      await expect(service.hasSufficientBalance('emp-1', 'policy-annual', 2026, 20)).resolves.toBe(false);
    });

    it('should return true when requestedDays === availableDays exactly', async () => {
      setupBalance();
      await expect(service.hasSufficientBalance('emp-1', 'policy-annual', 2026, 15)).resolves.toBe(true);
    });
  });

  describe('reserveDays', () => {
    const setupBalance = () => {
      const balance = makeLeaveBalance({ entitlementDays: 20, usedDays: 0, pendingDays: 0 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);
    };

    it('should increment pendingDays from 0 to 3', async () => {
      setupBalance();
      mockRepo.updateCounters.mockResolvedValue(makeLeaveBalance({ pendingDays: 3 }));

      await service.reserveDays('emp-1', 'policy-annual', 2026, 3);

      expect(mockRepo.updateCounters).toHaveBeenCalledWith('balance-1', 0, 3);
    });

    it('should throw when reservation exceeds available days', async () => {
      setupBalance();

      await expect(service.reserveDays('emp-1', 'policy-annual', 2026, 21)).rejects.toThrow(
        'Insufficient available balance: requested 21, available 20',
      );
    });

  });

  describe('commitDays', () => {
    it('should move pendingDays to usedDays: pending 3→0, used 0→3', async () => {
      const balance = makeLeaveBalance({ usedDays: 0, pendingDays: 3 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);
      mockRepo.updateCounters.mockResolvedValue(makeLeaveBalance({ usedDays: 3, pendingDays: 0 }));

      await service.commitDays('emp-1', 'policy-annual', 2026, 3);

      expect(mockRepo.updateCounters).toHaveBeenCalledWith('balance-1', 3, 0);
    });

    it('should throw when pendingDays < days', async () => {
      const balance = makeLeaveBalance({ pendingDays: 2 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);

      await expect(service.commitDays('emp-1', 'policy-annual', 2026, 3)).rejects.toThrow(
        'Insufficient pending days: requested 3, pending 2',
      );
    });

  });

  describe('releaseDays', () => {
    it('should decrement pendingDays from 3 to 0', async () => {
      const balance = makeLeaveBalance({ pendingDays: 3 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);
      mockRepo.updateCounters.mockResolvedValue(makeLeaveBalance({ pendingDays: 0 }));

      await service.releaseDays('emp-1', 'policy-annual', 2026, 3);

      expect(mockRepo.updateCounters).toHaveBeenCalledWith('balance-1', 0, 0);
    });

    it('should throw when pendingDays < days', async () => {
      const balance = makeLeaveBalance({ pendingDays: 2 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);

      await expect(service.releaseDays('emp-1', 'policy-annual', 2026, 3)).rejects.toThrow(
        'Insufficient pending days: requested 3, pending 2',
      );
    });

  });

  describe('restoreDays', () => {
    it('should decrement usedDays from 3 to 0', async () => {
      const balance = makeLeaveBalance({ usedDays: 3 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);
      mockRepo.updateCounters.mockResolvedValue(makeLeaveBalance({ usedDays: 0 }));

      await service.restoreDays('emp-1', 'policy-annual', 2026, 3);

      expect(mockRepo.updateCounters).toHaveBeenCalledWith('balance-1', 0, 0);
    });

    it('should throw when usedDays < days', async () => {
      const balance = makeLeaveBalance({ usedDays: 2 });
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(balance);

      await expect(service.restoreDays('emp-1', 'policy-annual', 2026, 3)).rejects.toThrow(
        'Insufficient used days: requested 3, used 2',
      );
    });

  });

  describe('getBalanceForOperation (private)', () => {
    it('should throw when no balance is found for the operation', async () => {
      mockRepo.findByEmployeePolicyAndYear.mockResolvedValue(null);

      await expect(service.reserveDays('emp-1', 'policy-annual', 2026, 3)).rejects.toThrow(
        'No balance found for employee emp-1, policy policy-annual, year 2026',
      );
    });
  });
});
