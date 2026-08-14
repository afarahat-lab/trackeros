import { LeaveBalanceService } from '../../../../src/modules/leave-balance/leave-balance.service';
import { ILeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { ILeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { LeaveType, BalanceStatus, EmploymentStatus } from '../../../../src/shared/types/leave.types';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 24,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    policyId: 'pol-001',
    totalEntitlement: 24,
    usedDays: 5,
    remainingDays: 19,
    fiscalYear: 2026,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2025-03-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2025-03-15T00:00:00.000Z'),
    updatedAt: new Date('2025-03-15T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let mockBalanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let mockPolicyRepo: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    mockBalanceRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeAndFiscalYear: jest.fn(),
      findByEmployeeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deductDays: jest.fn(),
      restoreDays: jest.fn(),
    };

    mockPolicyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
    };

    service = new LeaveBalanceService(mockBalanceRepo, mockPolicyRepo);
  });

  describe('getBalance', () => {
    it('returns the balance for the employee, leave type, and fiscal year', async () => {
      const policy = makePolicy();
      const balance = makeBalance();
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-001', LeaveType.ANNUAL, 2026);

      expect(mockPolicyRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL, undefined);
      expect(mockBalanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith(
        'emp-001', 'pol-001', 2026, undefined,
      );
      expect(result).toEqual(balance);
    });

    it('returns null when no active policy exists for the leave type', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.getBalance('emp-001', LeaveType.ANNUAL);

      expect(result).toBeNull();
      expect(mockBalanceRepo.findByEmployeeAndPolicy).not.toHaveBeenCalled();
    });

    it('returns null when policy exists but is inactive', async () => {
      const policy = makePolicy({ isActive: false });
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);

      const result = await service.getBalance('emp-001', LeaveType.ANNUAL);

      expect(result).toBeNull();
    });

    it('returns null when no balance record exists', async () => {
      const policy = makePolicy();
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      const result = await service.getBalance('emp-001', LeaveType.ANNUAL, 2026);

      expect(result).toBeNull();
    });

    it('passes the optional PoolClient through to repositories', async () => {
      const client = { query: jest.fn() } as unknown as import('pg').PoolClient;
      const policy = makePolicy();
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance());

      await service.getBalance('emp-001', LeaveType.ANNUAL, 2026, client);

      expect(mockPolicyRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL, client);
      expect(mockBalanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith(
        'emp-001', 'pol-001', 2026, client,
      );
    });
  });

  describe('initializeBalancesForEmployee', () => {
    it('creates pro-rated balances for all active policies for same-year hire', async () => {
      // Hired in March 2025 (month index 2) → whole months remaining = 11 - 2 = 9
      // Annual: 24 * 9 / 12 = 18, Sick: 12 * 9 / 12 = 9
      const employee = makeEmployee({ hireDate: new Date('2025-03-15T00:00:00.000Z') });
      const policies = [
        makePolicy({ id: 'pol-001', leaveType: LeaveType.ANNUAL, entitlementDays: 24 }),
        makePolicy({ id: 'pol-002', leaveType: LeaveType.SICK, entitlementDays: 12, policyName: 'Sick Leave' }),
      ];
      const createdBalances = [
        makeBalance({ id: 'bal-001', policyId: 'pol-001', totalEntitlement: 18, usedDays: 0, remainingDays: 18, fiscalYear: 2025 }),
        makeBalance({ id: 'bal-002', policyId: 'pol-002', totalEntitlement: 9, usedDays: 0, remainingDays: 9, fiscalYear: 2025 }),
      ];

      mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
      mockBalanceRepo.create
        .mockResolvedValueOnce(createdBalances[0])
        .mockResolvedValueOnce(createdBalances[1]);

      const result = await service.initializeBalancesForEmployee(employee);

      expect(mockPolicyRepo.findAllActive).toHaveBeenCalledWith(undefined);
      expect(mockBalanceRepo.create).toHaveBeenCalledTimes(2);
      expect(mockBalanceRepo.create).toHaveBeenCalledWith(
        {
          employeeId: 'emp-001',
          policyId: 'pol-001',
          totalEntitlement: 18,
          usedDays: 0,
          remainingDays: 18,
          fiscalYear: 2025,
          status: BalanceStatus.ACTIVE,
        },
        undefined,
      );
      expect(mockBalanceRepo.create).toHaveBeenCalledWith(
        {
          employeeId: 'emp-001',
          policyId: 'pol-002',
          totalEntitlement: 9,
          usedDays: 0,
          remainingDays: 9,
          fiscalYear: 2025,
          status: BalanceStatus.ACTIVE,
        },
        undefined,
      );
      expect(result).toEqual(createdBalances);
    });

    it('pro-rates entitlement for mid-year hires (same fiscal year)', async () => {
      // Hired in April 2026 (month index 3) → whole months remaining = 11 - 3 = 8
      // Pro-rated: 24 * 8 / 12 = 16
      const employee = makeEmployee({ hireDate: new Date('2026-04-10T00:00:00.000Z') });
      const policy = makePolicy({ entitlementDays: 24 });
      const createdBalance = makeBalance({
        totalEntitlement: 16,
        usedDays: 0,
        remainingDays: 16,
        fiscalYear: 2026,
      });

      mockPolicyRepo.findAllActive.mockResolvedValueOnce([policy]);
      mockBalanceRepo.create.mockResolvedValueOnce(createdBalance);

      const result = await service.initializeBalancesForEmployee(employee);

      expect(mockBalanceRepo.create).toHaveBeenCalledWith(
        {
          employeeId: 'emp-001',
          policyId: 'pol-001',
          totalEntitlement: 16,
          usedDays: 0,
          remainingDays: 16,
          fiscalYear: 2026,
          status: BalanceStatus.ACTIVE,
        },
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it('pro-rates entitlement for hire in January (11 months remaining)', async () => {
      // Hired in January 2026 (month index 0) → whole months remaining = 11 - 0 = 11
      // Pro-rated: 24 * 11 / 12 = 22
      const employee = makeEmployee({ hireDate: new Date('2026-01-15T00:00:00.000Z') });
      const policy = makePolicy({ entitlementDays: 24 });

      mockPolicyRepo.findAllActive.mockResolvedValueOnce([policy]);
      mockBalanceRepo.create.mockResolvedValueOnce(makeBalance({ totalEntitlement: 22, remainingDays: 22 }));

      await service.initializeBalancesForEmployee(employee);

      expect(mockBalanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalEntitlement: 22, remainingDays: 22 }),
        undefined,
      );
    });

    it('gives zero entitlement for hire in December (0 months remaining)', async () => {
      // Hired in December 2026 (month index 11) → whole months remaining = 11 - 11 = 0
      const employee = makeEmployee({ hireDate: new Date('2026-12-01T00:00:00.000Z') });
      const policy = makePolicy({ entitlementDays: 24 });

      mockPolicyRepo.findAllActive.mockResolvedValueOnce([policy]);
      mockBalanceRepo.create.mockResolvedValueOnce(
        makeBalance({ totalEntitlement: 0, usedDays: 0, remainingDays: 0, status: BalanceStatus.EXHAUSTED }),
      );

      await service.initializeBalancesForEmployee(employee);

      expect(mockBalanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalEntitlement: 0,
          remainingDays: 0,
          status: BalanceStatus.EXHAUSTED,
        }),
        undefined,
      );
    });

    it('passes the optional PoolClient through to repositories', async () => {
      const client = { query: jest.fn() } as unknown as import('pg').PoolClient;
      const employee = makeEmployee();
      mockPolicyRepo.findAllActive.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

      await service.initializeBalancesForEmployee(employee, client);

      expect(mockPolicyRepo.findAllActive).toHaveBeenCalledWith(client);
      expect(mockBalanceRepo.create).toHaveBeenCalledWith(expect.any(Object), client);
    });

    it('returns an empty array when no active policies exist', async () => {
      const employee = makeEmployee();
      mockPolicyRepo.findAllActive.mockResolvedValueOnce([]);

      const result = await service.initializeBalancesForEmployee(employee);

      expect(result).toEqual([]);
      expect(mockBalanceRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('deductOnApproval', () => {
    it('deducts days from the balance and returns the updated balance', async () => {
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 19, usedDays: 5 });
      const updatedBalance = makeBalance({ remainingDays: 16, usedDays: 8 });

      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.deductDays.mockResolvedValueOnce(updatedBalance);

      const result = await service.deductOnApproval('emp-001', LeaveType.ANNUAL, 3, 2026);

      expect(mockBalanceRepo.deductDays).toHaveBeenCalledWith('bal-001', 3, undefined);
      expect(result).toEqual(updatedBalance);
    });

    it('throws when no active policy exists for the leave type', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([]);

      await expect(
        service.deductOnApproval('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('No active leave policy found for leave type: annual');
    });

    it('throws when no balance record exists', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      await expect(
        service.deductOnApproval('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('No leave balance found');
    });

    it('throws when remaining days are insufficient', async () => {
      const balance = makeBalance({ remainingDays: 2 });
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      await expect(
        service.deductOnApproval('emp-001', LeaveType.ANNUAL, 5, 2026),
      ).rejects.toThrow('Insufficient leave balance');
    });

    it('throws when deductDays returns null (balance deleted concurrently)', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance());
      mockBalanceRepo.deductDays.mockResolvedValueOnce(null);

      await expect(
        service.deductOnApproval('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('Failed to deduct days');
    });

    it('passes the optional PoolClient through to repositories', async () => {
      const client = { query: jest.fn() } as unknown as import('pg').PoolClient;
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance());
      mockBalanceRepo.deductDays.mockResolvedValueOnce(makeBalance({ remainingDays: 16 }));

      await service.deductOnApproval('emp-001', LeaveType.ANNUAL, 3, 2026, client);

      expect(mockPolicyRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL, client);
      expect(mockBalanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith(
        'emp-001', 'pol-001', 2026, client,
      );
      expect(mockBalanceRepo.deductDays).toHaveBeenCalledWith('bal-001', 3, client);
    });
  });

  describe('releaseOnRejectionOrCancellation', () => {
    it('restores days to the balance and returns the updated balance', async () => {
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 16, usedDays: 8 });
      const updatedBalance = makeBalance({ remainingDays: 19, usedDays: 5 });

      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.restoreDays.mockResolvedValueOnce(updatedBalance);

      const result = await service.releaseOnRejectionOrCancellation('emp-001', LeaveType.ANNUAL, 3, 2026);

      expect(mockBalanceRepo.restoreDays).toHaveBeenCalledWith('bal-001', 3, undefined);
      expect(result).toEqual(updatedBalance);
    });

    it('throws when no active policy exists for the leave type', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([]);

      await expect(
        service.releaseOnRejectionOrCancellation('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('No active leave policy found for leave type: annual');
    });

    it('throws when no balance record exists', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      await expect(
        service.releaseOnRejectionOrCancellation('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('No leave balance found');
    });

    it('throws when restoreDays returns null', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance());
      mockBalanceRepo.restoreDays.mockResolvedValueOnce(null);

      await expect(
        service.releaseOnRejectionOrCancellation('emp-001', LeaveType.ANNUAL, 3, 2026),
      ).rejects.toThrow('Failed to restore days');
    });

    it('passes the optional PoolClient through to repositories', async () => {
      const client = { query: jest.fn() } as unknown as import('pg').PoolClient;
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance());
      mockBalanceRepo.restoreDays.mockResolvedValueOnce(makeBalance());

      await service.releaseOnRejectionOrCancellation('emp-001', LeaveType.ANNUAL, 3, 2026, client);

      expect(mockPolicyRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL, client);
      expect(mockBalanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith(
        'emp-001', 'pol-001', 2026, client,
      );
      expect(mockBalanceRepo.restoreDays).toHaveBeenCalledWith('bal-001', 3, client);
    });
  });

  describe('getRemainingDays', () => {
    it('returns the remaining days from the balance', async () => {
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 19 });
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([policy]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      const result = await service.getRemainingDays('emp-001', LeaveType.ANNUAL, 2026);

      expect(result).toBe(19);
    });

    it('returns 0 when no balance exists', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      const result = await service.getRemainingDays('emp-001', LeaveType.ANNUAL);

      expect(result).toBe(0);
    });

    it('returns 0 when no active policy exists', async () => {
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.getRemainingDays('emp-001', LeaveType.ANNUAL);

      expect(result).toBe(0);
    });

    it('passes the optional PoolClient through to repositories', async () => {
      const client = { query: jest.fn() } as unknown as import('pg').PoolClient;
      mockPolicyRepo.findByLeaveType.mockResolvedValueOnce([makePolicy()]);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(makeBalance({ remainingDays: 10 }));

      const result = await service.getRemainingDays('emp-001', LeaveType.ANNUAL, 2026, client);

      expect(result).toBe(10);
      expect(mockPolicyRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL, client);
    });
  });
});
