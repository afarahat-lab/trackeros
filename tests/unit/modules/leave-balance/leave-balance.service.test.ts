import { BalanceService, IBalanceService, LeaveBalance } from '../../../../src/modules/leave-balance';
import { ILeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { ILeavePolicyRepository, LeavePolicy } from '../../../../src/modules/leave-policy';
import { LeaveType } from '../../../../src/shared/types';

describe('BalanceService', () => {
  let service: IBalanceService;
  let balanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let policyRepo: jest.Mocked<ILeavePolicyRepository>;

  const mockPolicy: LeavePolicy = {
    id: 'lp-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: null,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockBalance: LeaveBalance = {
    id: 'lb-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    balanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ILeaveBalanceRepository>;

    policyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ILeavePolicyRepository>;

    service = new BalanceService(balanceRepo, policyRepo);
  });

  describe('getBalance', () => {
    it('should return the balance when found', async () => {
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);

      const result = await service.getBalance('emp-001', 'lp-001', 2026);

      expect(result).toEqual(mockBalance);
      expect(balanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-001', 'lp-001', 2026);
    });

    it('should return null when no balance exists', async () => {
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      const result = await service.getBalance('emp-001', 'lp-001', 2026);

      expect(result).toBeNull();
    });
  });

  describe('getBalancesForEmployee', () => {
    it('should return all balances for an employee in a fiscal year', async () => {
      const balances = [mockBalance];
      balanceRepo.findByEmployeeId.mockResolvedValue(balances);

      const result = await service.getBalancesForEmployee('emp-001', 2026);

      expect(result).toEqual(balances);
      expect(balanceRepo.findByEmployeeId).toHaveBeenCalledWith('emp-001', 2026);
    });

    it('should return an empty array when no balances exist', async () => {
      balanceRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.getBalancesForEmployee('emp-001', 2026);

      expect(result).toEqual([]);
    });
  });

  describe('initializeBalance', () => {
    it('should create a balance with the policy entitlementDays', async () => {
      policyRepo.findById.mockResolvedValue(mockPolicy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      balanceRepo.create.mockResolvedValue(mockBalance);

      const result = await service.initializeBalance('emp-001', 'lp-001', 2026);

      expect(result).toEqual(mockBalance);
      expect(policyRepo.findById).toHaveBeenCalledWith('lp-001');
      expect(balanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-001', 'lp-001', 2026);
      expect(balanceRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-001',
        leavePolicyId: 'lp-001',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });

    it('should throw POLICY_NOT_FOUND when policy does not exist', async () => {
      policyRepo.findById.mockResolvedValue(null);

      await expect(service.initializeBalance('emp-001', 'lp-001', 2026)).rejects.toEqual({
        error: 'Leave policy not found',
        code: 'POLICY_NOT_FOUND',
      });

      expect(balanceRepo.findByEmployeeAndPolicy).not.toHaveBeenCalled();
      expect(balanceRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BALANCE_ALREADY_EXISTS when a balance already exists', async () => {
      policyRepo.findById.mockResolvedValue(mockPolicy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);

      await expect(service.initializeBalance('emp-001', 'lp-001', 2026)).rejects.toEqual({
        error: 'A balance already exists for this employee, policy, and fiscal year',
        code: 'BALANCE_ALREADY_EXISTS',
      });

      expect(balanceRepo.create).not.toHaveBeenCalled();
    });

    it('should set remainingDays equal to totalEntitlement when usedDays is 0', async () => {
      policyRepo.findById.mockResolvedValue(mockPolicy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      balanceRepo.create.mockImplementation(async (input) => {
        const created: LeaveBalance = {
          ...input,
          id: 'lb-new',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return created;
      });

      const result = await service.initializeBalance('emp-001', 'lp-001', 2026);

      expect(result.remainingDays).toBe(result.totalEntitlement);
      expect(result.usedDays).toBe(0);
      expect(result.status).toBe('ACTIVE');
    });
  });
});
