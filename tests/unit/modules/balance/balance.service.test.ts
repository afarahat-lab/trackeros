import { BalanceService } from '../../../../src/modules/balance/balance.service';
import { IBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { IPolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { LeaveType } from '../../../../src/shared/types/leave-type.enum';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: 20,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('BalanceService', () => {
  let mockBalanceRepo: jest.Mocked<IBalanceRepository>;
  let mockPolicyRepo: jest.Mocked<IPolicyRepository>;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;
  let service: BalanceService;

  beforeEach(() => {
    mockBalanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeAndFiscalYear: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateUsedDays: jest.fn(),
    };
    mockPolicyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockEmployeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new BalanceService(mockBalanceRepo, mockPolicyRepo, mockEmployeeRepo);
  });

  describe('getBalance', () => {
    it('should return balance when found', async () => {
      const balance = makeBalance();
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      const result = await service.getBalance('emp-1', 'pol-1');

      expect(result).toEqual(balance);
      expect(mockBalanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-1', 'pol-1');
    });

    it('should return null when not found', async () => {
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      const result = await service.getBalance('emp-1', 'pol-1');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableDays', () => {
    it('should return remainingDays from balance', async () => {
      const balance = makeBalance({ remainingDays: 15 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      const result = await service.getAvailableDays('emp-1', 'pol-1');

      expect(result).toBe(15);
    });

    it('should return 0 when no balance exists', async () => {
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      const result = await service.getAvailableDays('emp-1', 'pol-1');

      expect(result).toBe(0);
    });
  });

  describe('reserveDays', () => {
    it('should reduce remainingDays by the reserved amount', async () => {
      const balance = makeBalance({ remainingDays: 20 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.update.mockResolvedValueOnce(makeBalance({ remainingDays: 15 }));

      await service.reserveDays('emp-1', 'pol-1', 5);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', { remainingDays: 15 });
    });

    it('should throw when days is zero', async () => {
      await expect(service.reserveDays('emp-1', 'pol-1', 0)).rejects.toThrow(
        'Days to reserve must be positive',
      );
    });

    it('should throw when days is negative', async () => {
      await expect(service.reserveDays('emp-1', 'pol-1', -1)).rejects.toThrow(
        'Days to reserve must be positive',
      );
    });

    it('should throw when no balance exists', async () => {
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      await expect(service.reserveDays('emp-1', 'pol-1', 5)).rejects.toThrow(
        'No balance found for the given employee and policy',
      );
    });

    it('should throw when insufficient remaining days', async () => {
      const balance = makeBalance({ remainingDays: 3 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);

      await expect(service.reserveDays('emp-1', 'pol-1', 5)).rejects.toThrow(
        'Insufficient available balance',
      );
    });

    it('should allow reserving exactly the remaining balance', async () => {
      const balance = makeBalance({ remainingDays: 5 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.update.mockResolvedValueOnce(makeBalance({ remainingDays: 0 }));

      await service.reserveDays('emp-1', 'pol-1', 5);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', { remainingDays: 0 });
    });
  });

  describe('releaseReservation', () => {
    it('should increase remainingDays by the released amount', async () => {
      const balance = makeBalance({ remainingDays: 10 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.update.mockResolvedValueOnce(makeBalance({ remainingDays: 15 }));

      await service.releaseReservation('emp-1', 'pol-1', 5);

      expect(mockBalanceRepo.update).toHaveBeenCalledWith('bal-1', { remainingDays: 15 });
    });

    it('should throw when days is zero', async () => {
      await expect(service.releaseReservation('emp-1', 'pol-1', 0)).rejects.toThrow(
        'Days to release must be positive',
      );
    });

    it('should throw when days is negative', async () => {
      await expect(service.releaseReservation('emp-1', 'pol-1', -1)).rejects.toThrow(
        'Days to release must be positive',
      );
    });

    it('should throw when no balance exists', async () => {
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      await expect(service.releaseReservation('emp-1', 'pol-1', 5)).rejects.toThrow(
        'No balance found for the given employee and policy',
      );
    });
  });

  describe('deductDays', () => {
    it('should increase usedDays and keep remainingDays unchanged', async () => {
      const balance = makeBalance({ usedDays: 0, remainingDays: 15 });
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(balance);
      mockBalanceRepo.updateUsedDays.mockResolvedValueOnce(
        makeBalance({ usedDays: 5, remainingDays: 15 }),
      );

      await service.deductDays('emp-1', 'pol-1', 5);

      expect(mockBalanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-1', 5, 15);
    });

    it('should throw when days is zero', async () => {
      await expect(service.deductDays('emp-1', 'pol-1', 0)).rejects.toThrow(
        'Days to deduct must be positive',
      );
    });

    it('should throw when days is negative', async () => {
      await expect(service.deductDays('emp-1', 'pol-1', -1)).rejects.toThrow(
        'Days to deduct must be positive',
      );
    });

    it('should throw when no balance exists', async () => {
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValueOnce(null);

      await expect(service.deductDays('emp-1', 'pol-1', 5)).rejects.toThrow(
        'No balance found for the given employee and policy',
      );
    });
  });

  describe('initializeBalancesForEmployee', () => {
    it('should create balances for all active policies', async () => {
      const employee = makeEmployee({ hireDate: new Date('2023-01-15') });
      const policies = [
        makePolicy({ id: 'pol-1', entitlementDays: 20 }),
        makePolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: LeaveType.SICK, entitlementDays: 10 }),
      ];

      mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
      mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      mockBalanceRepo.create.mockResolvedValueOnce(makeBalance({ id: 'bal-1', policyId: 'pol-1' }));
      mockBalanceRepo.create.mockResolvedValueOnce(makeBalance({ id: 'bal-2', policyId: 'pol-2' }));

      await service.initializeBalancesForEmployee('emp-1');

      expect(mockBalanceRepo.create).toHaveBeenCalledTimes(2);
      expect(mockBalanceRepo.create).toHaveBeenNthCalledWith(1, {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
      expect(mockBalanceRepo.create).toHaveBeenNthCalledWith(2, {
        employeeId: 'emp-1',
        policyId: 'pol-2',
        totalEntitlement: 10,
        usedDays: 0,
        remainingDays: 10,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });

    it('should skip policies that already have a balance', async () => {
      const employee = makeEmployee({ hireDate: new Date('2023-01-15') });
      const policies = [
        makePolicy({ id: 'pol-1', entitlementDays: 20 }),
        makePolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: LeaveType.SICK, entitlementDays: 10 }),
      ];

      mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
      mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
      mockBalanceRepo.findByEmployeeAndPolicy
        .mockResolvedValueOnce(makeBalance({ id: 'bal-1', policyId: 'pol-1' }))
        .mockResolvedValueOnce(null);
      mockBalanceRepo.create.mockResolvedValueOnce(makeBalance({ id: 'bal-2', policyId: 'pol-2' }));

      await service.initializeBalancesForEmployee('emp-1');

      expect(mockBalanceRepo.create).toHaveBeenCalledTimes(1);
      expect(mockBalanceRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        policyId: 'pol-2',
        totalEntitlement: 10,
        usedDays: 0,
        remainingDays: 10,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
    });

    it('should throw when employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValueOnce(null);

      await expect(service.initializeBalancesForEmployee('nonexistent')).rejects.toThrow(
        'Employee not found',
      );
    });

    describe('mid-year hire pro-rating', () => {
      it('should pro-rate entitlement for employee hired mid-year (not on 1st)', async () => {
        const employee = makeEmployee({ hireDate: new Date('2026-03-15') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 24 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        // Hired Mar 15: remaining whole months = Apr..Dec = 9 months
        // floor(24 * 9 / 12) = floor(18) = 18
        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 18,
            remainingDays: 18,
          }),
        );
      });

      it('should pro-rate entitlement for employee hired on the 1st of a month', async () => {
        const employee = makeEmployee({ hireDate: new Date('2026-07-01') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 24 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        // Hired Jul 1: remaining whole months = Jul..Dec = 6 months
        // floor(24 * 6 / 12) = floor(12) = 12
        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 12,
            remainingDays: 12,
          }),
        );
      });

      it('should give zero entitlement when hired in December (not on 1st)', async () => {
        const employee = makeEmployee({ hireDate: new Date('2026-12-15') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 20 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        // Hired Dec 15: remaining whole months = 0
        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 0,
            remainingDays: 0,
            status: 'EXHAUSTED',
          }),
        );
      });

      it('should give full entitlement for employee hired in previous years', async () => {
        const employee = makeEmployee({ hireDate: new Date('2023-01-15') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 20 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 20,
            remainingDays: 20,
          }),
        );
      });

      it('should give zero entitlement for employee hired in future year', async () => {
        const employee = makeEmployee({ hireDate: new Date('2027-06-01') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 20 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 0,
            remainingDays: 0,
            status: 'EXHAUSTED',
          }),
        );
      });

      it('should give full month credit when hired on December 1st', async () => {
        const employee = makeEmployee({ hireDate: new Date('2026-12-01') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 24 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        // Hired Dec 1: remaining whole months = Dec = 1 month
        // floor(24 * 1 / 12) = floor(2) = 2
        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 2,
            remainingDays: 2,
          }),
        );
      });

      it('should handle January 1st hire as full year', async () => {
        const employee = makeEmployee({ hireDate: new Date('2026-01-01') });
        const policies = [makePolicy({ id: 'pol-1', entitlementDays: 20 })];

        mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
        mockPolicyRepo.findAllActive.mockResolvedValueOnce(policies);
        mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
        mockBalanceRepo.create.mockResolvedValueOnce(makeBalance());

        await service.initializeBalancesForEmployee('emp-1');

        // Hired Jan 1: remaining whole months = Jan..Dec = 12 months
        // floor(20 * 12 / 12) = 20
        expect(mockBalanceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            totalEntitlement: 20,
            remainingDays: 20,
          }),
        );
      });
    });

    it('should handle no active policies gracefully', async () => {
      const employee = makeEmployee();
      mockEmployeeRepo.findById.mockResolvedValueOnce(employee);
      mockPolicyRepo.findAllActive.mockResolvedValueOnce([]);

      await service.initializeBalancesForEmployee('emp-1');

      expect(mockBalanceRepo.create).not.toHaveBeenCalled();
    });
  });
});
