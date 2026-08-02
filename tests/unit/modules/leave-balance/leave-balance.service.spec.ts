import {
  LeaveBalanceService,
  NoActivePolicyError,
  BalanceNotFoundError,
  InsufficientBalanceError,
} from '../../../../src/modules/leave-balance/leave-balance.service';
import { ILeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { ILeavePolicyService } from '../../../../src/modules/leave-policy/leave-policy.service.interface';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'lb-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    policyId: 'lp-1',
    totalEntitlement: 20,
    usedDays: 5,
    pendingDays: 0,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-1',
    policyName: 'Annual Leave Policy',
    leaveTypeId: 'lt-annual',
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let mockRepo: jest.Mocked<ILeaveBalanceRepository>;
  let mockPolicyService: jest.Mocked<ILeavePolicyService>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmployeeAndType: jest.fn(),
      findByEmployee: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      incrementUsedDays: jest.fn(),
      decrementUsedDays: jest.fn(),
    };
    mockPolicyService = {
      getActivePolicy: jest.fn(),
      getPolicyById: jest.fn(),
      getAllPolicies: jest.fn(),
      createPolicy: jest.fn(),
      updatePolicy: jest.fn(),
    };
    service = new LeaveBalanceService(mockRepo, mockPolicyService);
  });

  describe('getBalance', () => {
    it('should return a balance when found', async () => {
      const balance = makeBalance();
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-1', 'lt-annual', 2026);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lb-1');
      expect(result!.remainingDays).toBe(15);
      expect(mockRepo.findByEmployeeAndType).toHaveBeenCalledWith('emp-1', 'lt-annual', 2026);
    });

    it('should return null when no balance exists', async () => {
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(null);

      const result = await service.getBalance('emp-1', 'lt-annual', 2026);

      expect(result).toBeNull();
    });

    it('should propagate repository errors', async () => {
      mockRepo.findByEmployeeAndType.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getBalance('emp-1', 'lt-annual', 2026)).rejects.toThrow('db error');
    });
  });

  describe('getAllBalances', () => {
    it('should return all balances for an employee', async () => {
      const balance1 = makeBalance({ id: 'lb-1', leaveTypeId: 'lt-annual' });
      const balance2 = makeBalance({ id: 'lb-2', leaveTypeId: 'lt-sick' });
      mockRepo.findByEmployee.mockResolvedValueOnce([balance1, balance2]);

      const result = await service.getAllBalances('emp-1', 2026);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lb-1');
      expect(result[1].id).toBe('lb-2');
      expect(mockRepo.findByEmployee).toHaveBeenCalledWith('emp-1', 2026);
    });

    it('should return an empty array when no balances exist', async () => {
      mockRepo.findByEmployee.mockResolvedValueOnce([]);

      const result = await service.getAllBalances('emp-1', 2026);

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      mockRepo.findByEmployee.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getAllBalances('emp-1', 2026)).rejects.toThrow('db error');
    });
  });

  describe('initializeBalance', () => {
    it('should create a balance from the active policy', async () => {
      const policy = makePolicy({ id: 'lp-1', entitlementDays: 20 });
      mockPolicyService.getActivePolicy.mockResolvedValueOnce(policy);

      const created = makeBalance({
        id: 'lb-new',
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 20,
        totalEntitlement: 20,
        policyId: 'lp-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockRepo.create.mockResolvedValueOnce(created);

      const result = await service.initializeBalance('emp-1', 'lt-annual', 2026);

      expect(result.id).toBe('lb-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.leaveTypeId).toBe('lt-annual');
      expect(result.policyId).toBe('lp-1');
      expect(result.totalEntitlement).toBe(20);
      expect(result.usedDays).toBe(0);
      expect(result.pendingDays).toBe(0);
      expect(result.remainingDays).toBe(20);
      expect(result.fiscalYear).toBe(2026);
      expect(result.status).toBe('ACTIVE');
      expect(mockPolicyService.getActivePolicy).toHaveBeenCalledWith('lt-annual');
      expect(mockRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-annual',
        policyId: 'lp-1',
        totalEntitlement: 20,
        usedDays: 0,
        pendingDays: 0,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });

    it('should throw NoActivePolicyError when no active policy exists', async () => {
      mockPolicyService.getActivePolicy.mockResolvedValue(null);

      const error = await service.initializeBalance('emp-1', 'lt-annual', 2026).catch((e) => e);
      expect(error).toBeInstanceOf(NoActivePolicyError);
      expect((error as Error).message).toContain(
        'No active policy found for leave type: lt-annual',
      );
    });

    it('should propagate repository create errors', async () => {
      const policy = makePolicy();
      mockPolicyService.getActivePolicy.mockResolvedValueOnce(policy);
      mockRepo.create.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(service.initializeBalance('emp-1', 'lt-annual', 2026)).rejects.toThrow(
        'duplicate key',
      );
    });
  });

  describe('deductDays', () => {
    it('should atomically increment usedDays when sufficient balance exists', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 5 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      const updated = makeBalance({ totalEntitlement: 20, usedDays: 8, remainingDays: 12 });
      mockRepo.incrementUsedDays.mockResolvedValueOnce(updated);

      const result = await service.deductDays('emp-1', 'lt-annual', 2026, 3);

      expect(result.usedDays).toBe(8);
      expect(result.remainingDays).toBe(12);
      expect(mockRepo.incrementUsedDays).toHaveBeenCalledWith('lb-1', 3);
    });

    it('should throw InsufficientBalanceError when remaining would go below zero', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 18 });
      mockRepo.findByEmployeeAndType.mockResolvedValue(balance);

      const error = await service.deductDays('emp-1', 'lt-annual', 2026, 5).catch((e) => e);
      expect(error).toBeInstanceOf(InsufficientBalanceError);
      expect((error as Error).message).toContain(
        'Insufficient balance: requested 5 days but only 2 remaining',
      );
      expect(mockRepo.incrementUsedDays).not.toHaveBeenCalled();
    });

    it('should throw InsufficientBalanceError when remaining is exactly zero', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 20 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      await expect(service.deductDays('emp-1', 'lt-annual', 2026, 1)).rejects.toThrow(
        InsufficientBalanceError,
      );
      expect(mockRepo.incrementUsedDays).not.toHaveBeenCalled();
    });

    it('should throw BalanceNotFoundError when balance does not exist', async () => {
      mockRepo.findByEmployeeAndType.mockResolvedValue(null);

      const error = await service.deductDays('emp-1', 'lt-annual', 2026, 3).catch((e) => e);
      expect(error).toBeInstanceOf(BalanceNotFoundError);
      expect((error as Error).message).toContain(
        'No balance found for employee emp-1, leave type lt-annual, fiscal year 2026',
      );
    });

    it('should throw BalanceNotFoundError when increment returns null', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 5 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);
      mockRepo.incrementUsedDays.mockResolvedValueOnce(null);

      await expect(service.deductDays('emp-1', 'lt-annual', 2026, 3)).rejects.toThrow(
        BalanceNotFoundError,
      );
    });
  });

  describe('restoreDays', () => {
    it('should atomically decrement usedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 8 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      const updated = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      mockRepo.decrementUsedDays.mockResolvedValueOnce(updated);

      const result = await service.restoreDays('emp-1', 'lt-annual', 2026, 3);

      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
      expect(mockRepo.decrementUsedDays).toHaveBeenCalledWith('lb-1', 3);
    });

    it('should throw when restore would drive usedDays below zero', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 2 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      await expect(service.restoreDays('emp-1', 'lt-annual', 2026, 5)).rejects.toThrow(
        'Cannot restore 5 days: usedDays would go below zero',
      );
      expect(mockRepo.decrementUsedDays).not.toHaveBeenCalled();
    });

    it('should throw BalanceNotFoundError when balance does not exist', async () => {
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(null);

      await expect(service.restoreDays('emp-1', 'lt-annual', 2026, 3)).rejects.toThrow(
        BalanceNotFoundError,
      );
    });

    it('should throw BalanceNotFoundError when decrement returns null', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 8 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);
      mockRepo.decrementUsedDays.mockResolvedValueOnce(null);

      await expect(service.restoreDays('emp-1', 'lt-annual', 2026, 3)).rejects.toThrow(
        BalanceNotFoundError,
      );
    });
  });

  describe('remainingDays invariant', () => {
    it('should always satisfy remainingDays === totalEntitlement - usedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      mockRepo.findByEmployeeAndType.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-1', 'lt-annual', 2026);

      expect(result!.remainingDays).toBe(result!.totalEntitlement - result!.usedDays);
    });
  });
});
