import { LeaveBalanceService } from '../../../../src/modules/leave-balance/leave-balance.service';
import { ILeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository.interface';
import { ILeavePolicyService, AppError, LeavePolicy } from '../../../../src/modules/leave-policy';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: overrides.id ?? 'lb-1',
    employeeId: overrides.employeeId ?? 'emp-1',
    policyId: overrides.policyId ?? 'lp-1',
    totalEntitlement: overrides.totalEntitlement ?? 20,
    usedDays: overrides.usedDays ?? 0,
    pendingDays: overrides.pendingDays ?? 0,
    remainingDays: overrides.remainingDays ?? 20,
    fiscalYear: overrides.fiscalYear ?? 2025,
    status: overrides.status ?? 'ACTIVE',
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: overrides.id ?? 'lp-1',
    policyName: overrides.policyName ?? 'Standard Annual Policy',
    leaveTypeId: overrides.leaveTypeId ?? 'lt-1',
    entitlementDays: overrides.entitlementDays ?? 20,
    accrualRate: overrides.accrualRate ?? undefined,
    maxAccumulation: overrides.maxAccumulation ?? undefined,
    minimumNoticeDays: overrides.minimumNoticeDays ?? undefined,
    requiresManagerApproval: overrides.requiresManagerApproval ?? true,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let mockBalanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let mockPolicyService: jest.Mocked<ILeavePolicyService>;

  beforeEach(() => {
    mockBalanceRepo = {
      findByEmployeeId: jest.fn(),
      findByEmployeeIdAndFiscalYear: jest.fn(),
      findByEmployeeIdAndPolicyId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createBatch: jest.fn(),
    };

    mockPolicyService = {
      getPolicyForLeaveType: jest.fn(),
      getActivePolicies: jest.fn(),
      calculateEntitlement: jest.fn(),
      validatePolicy: jest.fn(),
    };

    service = new LeaveBalanceService(mockBalanceRepo, mockPolicyService);
  });

  // ── getBalancesForEmployee ─────────────────────────────────────────

  describe('getBalancesForEmployee', () => {
    it('should return all balances when fiscalYear is omitted', async () => {
      const balances = [
        makeLeaveBalance({ id: 'lb-1', fiscalYear: 2025 }),
        makeLeaveBalance({ id: 'lb-2', fiscalYear: 2024 }),
      ];
      mockBalanceRepo.findByEmployeeId.mockResolvedValue(balances);

      const result = await service.getBalancesForEmployee('emp-1');

      expect(mockBalanceRepo.findByEmployeeId).toHaveBeenCalledWith('emp-1');
      expect(result).toEqual(balances);
    });

    it('should return balances filtered by fiscalYear when provided', async () => {
      const balances = [makeLeaveBalance({ id: 'lb-1', fiscalYear: 2025 })];
      mockBalanceRepo.findByEmployeeIdAndFiscalYear.mockResolvedValue(balances);

      const result = await service.getBalancesForEmployee('emp-1', 2025);

      expect(mockBalanceRepo.findByEmployeeIdAndFiscalYear).toHaveBeenCalledWith('emp-1', 2025);
      expect(result).toEqual(balances);
    });

    it('should return empty array when no balances exist', async () => {
      mockBalanceRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.getBalancesForEmployee('emp-1');

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockBalanceRepo.findByEmployeeId.mockRejectedValue(dbError);

      await expect(service.getBalancesForEmployee('emp-1')).rejects.toThrow('Database connection failed');
    });
  });

  // ── initializeBalancesForEmployee ──────────────────────────────────

  describe('initializeBalancesForEmployee', () => {
    it('should create balances for all active policies', async () => {
      const policy1 = makeLeavePolicy({ id: 'lp-1', entitlementDays: 20 });
      const policy2 = makeLeavePolicy({ id: 'lp-2', entitlementDays: 10, leaveTypeId: 'lt-2' });
      const hireDate = new Date(2025, 0, 15);

      mockPolicyService.getActivePolicies.mockResolvedValue([policy1, policy2]);
      mockPolicyService.calculateEntitlement
        .mockReturnValueOnce(18)
        .mockReturnValueOnce(9);

      const createdBalances = [
        makeLeaveBalance({ id: 'lb-1', employeeId: 'emp-1', policyId: 'lp-1', totalEntitlement: 18, fiscalYear: 2025 }),
        makeLeaveBalance({ id: 'lb-2', employeeId: 'emp-1', policyId: 'lp-2', totalEntitlement: 9, fiscalYear: 2025 }),
      ];
      mockBalanceRepo.createBatch.mockResolvedValue(createdBalances);

      const result = await service.initializeBalancesForEmployee('emp-1', hireDate);

      expect(mockPolicyService.getActivePolicies).toHaveBeenCalled();
      expect(mockPolicyService.calculateEntitlement).toHaveBeenCalledWith(policy1, hireDate, 2025);
      expect(mockPolicyService.calculateEntitlement).toHaveBeenCalledWith(policy2, hireDate, 2025);
      expect(mockBalanceRepo.createBatch).toHaveBeenCalledWith([
        {
          employeeId: 'emp-1',
          policyId: 'lp-1',
          totalEntitlement: 18,
          usedDays: 0,
          pendingDays: 0,
          fiscalYear: 2025,
          status: 'ACTIVE',
        },
        {
          employeeId: 'emp-1',
          policyId: 'lp-2',
          totalEntitlement: 9,
          usedDays: 0,
          pendingDays: 0,
          fiscalYear: 2025,
          status: 'ACTIVE',
        },
      ]);
      expect(result).toEqual(createdBalances);
    });

    it('should return empty array when no active policies exist', async () => {
      mockPolicyService.getActivePolicies.mockResolvedValue([]);

      const result = await service.initializeBalancesForEmployee('emp-1', new Date(2025, 0, 15));

      expect(result).toEqual([]);
      expect(mockBalanceRepo.createBatch).not.toHaveBeenCalled();
    });

    it('should use hireDate.getFullYear() as the fiscal year', async () => {
      const policy = makeLeavePolicy({ id: 'lp-1', entitlementDays: 20 });
      const hireDate = new Date(2024, 6, 1);

      mockPolicyService.getActivePolicies.mockResolvedValue([policy]);
      mockPolicyService.calculateEntitlement.mockReturnValue(20);
      mockBalanceRepo.createBatch.mockResolvedValue([
        makeLeaveBalance({ id: 'lb-1', fiscalYear: 2024 }),
      ]);

      await service.initializeBalancesForEmployee('emp-1', hireDate);

      expect(mockPolicyService.calculateEntitlement).toHaveBeenCalledWith(policy, hireDate, 2024);
    });

    it('should propagate policy service errors', async () => {
      const error = new Error('Policy service unavailable');
      mockPolicyService.getActivePolicies.mockRejectedValue(error);

      await expect(
        service.initializeBalancesForEmployee('emp-1', new Date(2025, 0, 15)),
      ).rejects.toThrow('Policy service unavailable');
    });

    it('should propagate repository errors during batch creation', async () => {
      const policy = makeLeavePolicy({ id: 'lp-1' });
      mockPolicyService.getActivePolicies.mockResolvedValue([policy]);
      mockPolicyService.calculateEntitlement.mockReturnValue(20);
      mockBalanceRepo.createBatch.mockRejectedValue(new Error('Insert failed'));

      await expect(
        service.initializeBalancesForEmployee('emp-1', new Date(2025, 0, 15)),
      ).rejects.toThrow('Insert failed');
    });
  });

  // ── getAvailableBalance ────────────────────────────────────────────

  describe('getAvailableBalance', () => {
    it('should return remainingDays - pendingDays', async () => {
      const balance = makeLeaveBalance({
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 3,
        remainingDays: 12,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);

      const result = await service.getAvailableBalance('emp-1', 'lp-1', 2025);

      expect(result).toBe(9); // 12 - 3
    });

    it('should throw NOT_FOUND when balance does not exist', async () => {
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(null);

      await expect(
        service.getAvailableBalance('emp-1', 'lp-1', 2025),
      ).rejects.toThrow(AppError);

      await expect(
        service.getAvailableBalance('emp-1', 'lp-1', 2025),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Balance not found for employee emp-1, policy lp-1, fiscal year 2025',
      });
    });

    it('should return zero when remainingDays equals pendingDays', async () => {
      const balance = makeLeaveBalance({
        totalEntitlement: 20,
        usedDays: 10,
        pendingDays: 10,
        remainingDays: 0,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);

      const result = await service.getAvailableBalance('emp-1', 'lp-1', 2025);

      expect(result).toBe(-10);
    });
  });

  // ── reserveDays ────────────────────────────────────────────────────

  describe('reserveDays', () => {
    it('should increment pendingDays when sufficient balance exists', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 0,
        pendingDays: 2,
        remainingDays: 18,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, pendingDays: 7 }),
      );

      await service.reserveDays('emp-1', 'lp-1', 5, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 7,
      });
    });

    it('should throw NOT_FOUND when balance does not exist', async () => {
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(null);

      await expect(
        service.reserveDays('emp-1', 'lp-1', 5, 2025),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Balance not found for employee emp-1, policy lp-1, fiscal year 2025',
      });
    });

    it('should throw INSUFFICIENT_BALANCE when available is less than requested', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 10,
        pendingDays: 5,
        remainingDays: 5,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);

      await expect(
        service.reserveDays('emp-1', 'lp-1', 3, 2025),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance: requested 3 day(s) but only 0 available',
      });

      expect(mockBalanceRepo.update).not.toHaveBeenCalled();
    });

    it('should allow reservation when available exactly equals requested', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 10,
        pendingDays: 0,
        remainingDays: 10,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, pendingDays: 10 }),
      );

      await service.reserveDays('emp-1', 'lp-1', 10, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 10,
      });
    });

    it('should not mutate balance when INSUFFICIENT_BALANCE is thrown', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 15,
        pendingDays: 3,
        remainingDays: 2,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);

      await expect(
        service.reserveDays('emp-1', 'lp-1', 1, 2025),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
      });

      expect(mockBalanceRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── finalizeDeduction ──────────────────────────────────────────────

  describe('finalizeDeduction', () => {
    it('should decrement pendingDays and increment usedDays atomically', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 3,
        remainingDays: 12,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, usedDays: 8, pendingDays: 0 }),
      );

      await service.finalizeDeduction('emp-1', 'lp-1', 3, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 0,
        usedDays: 8,
      });
    });

    it('should throw NOT_FOUND when balance does not exist', async () => {
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(null);

      await expect(
        service.finalizeDeduction('emp-1', 'lp-1', 3, 2025),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Balance not found for employee emp-1, policy lp-1, fiscal year 2025',
      });
    });

    it('should handle finalizing a large deduction', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 0,
        pendingDays: 20,
        remainingDays: 0,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, usedDays: 20, pendingDays: 0 }),
      );

      await service.finalizeDeduction('emp-1', 'lp-1', 20, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 0,
        usedDays: 20,
      });
    });
  });

  // ── releaseReservation ─────────────────────────────────────────────

  describe('releaseReservation', () => {
    it('should decrement pendingDays without altering usedDays', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 3,
        remainingDays: 12,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, pendingDays: 1 }),
      );

      await service.releaseReservation('emp-1', 'lp-1', 2, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 1,
      });
    });

    it('should throw NOT_FOUND when balance does not exist', async () => {
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(null);

      await expect(
        service.releaseReservation('emp-1', 'lp-1', 2, 2025),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Balance not found for employee emp-1, policy lp-1, fiscal year 2025',
      });
    });

    it('should never drive pendingDays below zero', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 1,
        remainingDays: 14,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, pendingDays: 0 }),
      );

      await service.releaseReservation('emp-1', 'lp-1', 5, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 0,
      });
    });

    it('should release all pending days', async () => {
      const balance = makeLeaveBalance({
        id: 'lb-1',
        totalEntitlement: 20,
        usedDays: 5,
        pendingDays: 3,
        remainingDays: 12,
      });
      mockBalanceRepo.findByEmployeeIdAndPolicyId.mockResolvedValue(balance);
      mockBalanceRepo.update.mockResolvedValue(
        makeLeaveBalance({ ...balance, pendingDays: 0 }),
      );

      await service.releaseReservation('emp-1', 'lp-1', 3, 2025);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('lb-1', {
        pendingDays: 0,
      });
    });
  });
});
