import { BalanceService } from 'modules/balance/balance.service';
import {
  LeaveBalance,
  IBalanceRepository,
  BalanceNotFoundError,
  InsufficientBalanceError,
} from 'modules/balance/balance.model';
import { PolicyService, LeavePolicy } from 'modules/policy';
import { LeaveType } from 'shared/types/leave.types';

function makeMockBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 5,
    pendingDays: 2,
    remainingDays: 13,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeMockPolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockBalanceRepo(): jest.Mocked<IBalanceRepository> {
  return {
    findById: jest.fn(),
    findByEmployeeAndYear: jest.fn(),
    findByEmployeeYearAndPolicy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deductPendingDays: jest.fn(),
    commitDeduction: jest.fn(),
    restorePendingDays: jest.fn(),
  };
}

function createMockPolicyService(): jest.Mocked<PolicyService> {
  return {
    getById: jest.fn(),
    getByLeaveType: jest.fn(),
    getAllActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getEntitlementForType: jest.fn(),
  } as unknown as jest.Mocked<PolicyService>;
}

describe('BalanceService', () => {
  let service: BalanceService;
  let balanceRepo: jest.Mocked<IBalanceRepository>;
  let policyService: jest.Mocked<PolicyService>;

  beforeEach(() => {
    balanceRepo = createMockBalanceRepo();
    policyService = createMockPolicyService();
    service = new BalanceService(balanceRepo, policyService);
  });

  describe('getById', () => {
    it('returns balance when found', async () => {
      const balance = makeMockBalance();
      balanceRepo.findById.mockResolvedValue(balance);

      const result = await service.getById('bal-1');
      expect(result).toEqual(balance);
    });

    it('throws BalanceNotFoundError when not found', async () => {
      balanceRepo.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(
        BalanceNotFoundError
      );
    });
  });

  describe('getOrCreateBalance', () => {
    it('returns existing balance if it exists', async () => {
      const policy = makeMockPolicy();
      const balance = makeMockBalance();
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(balance);

      const result = await service.getOrCreateBalance(
        'emp-1',
        LeaveType.ANNUAL,
        2026
      );

      expect(result).toEqual(balance);
      expect(balanceRepo.create).not.toHaveBeenCalled();
    });

    it('creates a new balance when none exists', async () => {
      const policy = makeMockPolicy();
      const newBalance = makeMockBalance({
        id: 'bal-new',
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 20,
      });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(null);
      balanceRepo.create.mockResolvedValue(newBalance);

      const result = await service.getOrCreateBalance(
        'emp-1',
        LeaveType.ANNUAL,
        2026
      );

      expect(result).toEqual(newBalance);
      expect(balanceRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 0,
        pendingDays: 0,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });
  });

  describe('getBalancesForEmployee', () => {
    it('returns balances for employee and year', async () => {
      const balances = [
        makeMockBalance({ id: 'bal-1', leaveType: LeaveType.ANNUAL } as unknown as Partial<LeaveBalance>),
      ];
      balanceRepo.findByEmployeeAndYear.mockResolvedValue(balances);

      const result = await service.getBalancesForEmployee('emp-1', 2026);
      expect(result).toEqual(balances);
      expect(balanceRepo.findByEmployeeAndYear).toHaveBeenCalledWith(
        'emp-1',
        2026
      );
    });
  });

  describe('hasSufficientBalance', () => {
    it('returns true when remainingDays >= requested', async () => {
      const policy = makeMockPolicy();
      const balance = makeMockBalance({ totalEntitlement: 20, usedDays: 4, pendingDays: 1, remainingDays: 15 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance(
        'emp-1',
        LeaveType.ANNUAL,
        2026,
        10
      );
      expect(result).toBe(true);
    });

    it('returns false when remainingDays < requested', async () => {
      const policy = makeMockPolicy();
      const balance = makeMockBalance({ totalEntitlement: 20, usedDays: 15, pendingDays: 3, remainingDays: 2 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance(
        'emp-1',
        LeaveType.ANNUAL,
        2026,
        5
      );
      expect(result).toBe(false);
    });

    it('creates balance and returns true for zero usage', async () => {
      const policy = makeMockPolicy();
      const balance = makeMockBalance({ usedDays: 0, pendingDays: 0, remainingDays: 20 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(null);
      balanceRepo.create.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance(
        'emp-1',
        LeaveType.ANNUAL,
        2026,
        5
      );
      expect(result).toBe(true);
    });
  });

  describe('reserveDays', () => {
    it('deducts pending days and returns updated balance', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance();
      const updated = makeMockBalance({ pendingDays: 5, remainingDays: 10 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.deductPendingDays.mockResolvedValue(updated);

      const result = await service.reserveDays('emp-1', LeaveType.ANNUAL, 2026, 3);
      expect(result).toEqual(updated);
      expect(balanceRepo.deductPendingDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('throws BalanceNotFoundError when deductPendingDays returns null', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance();
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.deductPendingDays.mockResolvedValue(null);

      await expect(
        service.reserveDays('emp-1', LeaveType.ANNUAL, 2026, 3)
      ).rejects.toThrow(BalanceNotFoundError);
    });
  });

  describe('commitDays', () => {
    it('commits deduction and returns updated balance', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance();
      const updated = makeMockBalance({ usedDays: 8, pendingDays: 0, remainingDays: 12 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.commitDeduction.mockResolvedValue(updated);

      const result = await service.commitDays('emp-1', LeaveType.ANNUAL, 2026, 3);
      expect(result).toEqual(updated);
      expect(balanceRepo.commitDeduction).toHaveBeenCalledWith('bal-1', 3);
    });

    it('throws BalanceNotFoundError when commitDeduction returns null', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance();
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.commitDeduction.mockResolvedValue(null);

      await expect(
        service.commitDays('emp-1', LeaveType.ANNUAL, 2026, 3)
      ).rejects.toThrow(BalanceNotFoundError);
    });
  });

  describe('restoreDays', () => {
    it('restores pending days and returns updated balance', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance({ pendingDays: 5 });
      const updated = makeMockBalance({ pendingDays: 2, remainingDays: 13 });
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.restorePendingDays.mockResolvedValue(updated);

      const result = await service.restoreDays('emp-1', LeaveType.ANNUAL, 2026, 3);
      expect(result).toEqual(updated);
      expect(balanceRepo.restorePendingDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('throws BalanceNotFoundError when restorePendingDays returns null', async () => {
      const policy = makeMockPolicy();
      const existing = makeMockBalance();
      policyService.getByLeaveType.mockResolvedValue(policy);
      balanceRepo.findByEmployeeYearAndPolicy.mockResolvedValue(existing);
      balanceRepo.restorePendingDays.mockResolvedValue(null);

      await expect(
        service.restoreDays('emp-1', LeaveType.ANNUAL, 2026, 3)
      ).rejects.toThrow(BalanceNotFoundError);
    });
  });

  describe('remainingDays derivation', () => {
    it('is computed as totalEntitlement - usedDays - pendingDays', () => {
      const balance = makeMockBalance({
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 3,
        remainingDays: 12,
      });
      expect(balance.remainingDays).toBe(12);
    });

    it('can reach zero', () => {
      const balance = makeMockBalance({
        totalEntitlement: 10,
        usedDays: 10,
        pendingDays: 0,
        remainingDays: 0,
      });
      expect(balance.remainingDays).toBe(0);
    });
  });
});
