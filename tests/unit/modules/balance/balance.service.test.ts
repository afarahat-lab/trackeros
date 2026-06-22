import { BalanceService } from '../../../../src/modules/balance/balance.service';
import { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { PolicyService } from '../../../../src/modules/policy/policy.service';
import { IAuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AppError } from '../../../../src/shared/types';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let balanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let employeeService: jest.Mocked<EmployeeService>;
  let policyService: jest.Mocked<PolicyService>;
  let auditRepo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    balanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndYear: jest.fn(),
      findByEmployeeLeaveTypeAndYear: jest.fn(),
      create: jest.fn(),
      updateUsedDays: jest.fn(),
    };
    employeeService = {
      getEmployeeById: jest.fn(),
      getEmployeeByEmail: jest.fn(),
      employeeExists: jest.fn(),
      getManagerHierarchy: jest.fn(),
      isManagerOf: jest.fn(),
    } as any;
    policyService = {
      getPolicyById: jest.fn(),
      getPolicyByLeaveTypeId: jest.fn(),
      createPolicy: jest.fn(),
      updatePolicy: jest.fn(),
      archivePolicy: jest.fn(),
    } as any;
    auditRepo = {
      createAuditLog: jest.fn(),
    };

    balanceService = new BalanceService(balanceRepo, employeeService, policyService, auditRepo);
  });

  describe('initializeBalance', () => {
    it('should successfully initialize a balance', async () => {
      const dto = { employeeId: 'emp1', leaveTypeId: 'lt1', year: 2023, totalDays: 20 };
      const mockBalance = { id: 'bal1', ...dto, usedDays: 0, remainingDays: 20 };
      
      employeeService.getEmployeeById.mockResolvedValue({ id: 'emp1' } as any);
      policyService.getPolicyByLeaveTypeId.mockResolvedValue({ id: 'pol1', allowNegativeBalance: false } as any);
      balanceRepo.create.mockResolvedValue(mockBalance as any);
      auditRepo.createAuditLog.mockResolvedValue({} as any);

      const result = await balanceService.initializeBalance(dto as any);
      
      expect(result).toEqual(mockBalance);
      expect(employeeService.getEmployeeById).toHaveBeenCalledWith('emp1');
      expect(policyService.getPolicyByLeaveTypeId).toHaveBeenCalledWith('lt1');
      expect(balanceRepo.create).toHaveBeenCalledWith(dto);
      expect(auditRepo.createAuditLog).toHaveBeenCalled();
    });

    it('should throw an error if employee is not found', async () => {
      employeeService.getEmployeeById.mockRejectedValue(new AppError('Employee not found', 404));
      await expect(balanceService.initializeBalance({ employeeId: 'emp1', leaveTypeId: 'lt1', year: 2023, totalDays: 20 } as any))
        .rejects.toThrow('Employee not found');
    });

    it('should throw an error if policy is not found', async () => {
      employeeService.getEmployeeById.mockResolvedValue({ id: 'emp1' } as any);
      policyService.getPolicyByLeaveTypeId.mockRejectedValue(new AppError('Policy not found', 404));
      await expect(balanceService.initializeBalance({ employeeId: 'emp1', leaveTypeId: 'lt1', year: 2023, totalDays: 20 } as any))
        .rejects.toThrow('Policy not found');
    });
  });

  describe('getBalance', () => {
    it('should return a balance', async () => {
      const mockBalance = { id: 'bal1' };
      balanceRepo.findByEmployeeLeaveTypeAndYear.mockResolvedValue(mockBalance as any);
      
      const result = await balanceService.getBalance('emp1', 'lt1', 2023);
      expect(result).toEqual(mockBalance);
    });

    it('should return null if balance is not found', async () => {
      balanceRepo.findByEmployeeLeaveTypeAndYear.mockResolvedValue(null);
      const result = await balanceService.getBalance('emp1', 'lt1', 2023);
      expect(result).toBeNull();
    });
  });

  describe('getBalancesForEmployee', () => {
    it('should return an array of balances', async () => {
      const mockBalances = [{ id: 'bal1' }, { id: 'bal2' }];
      balanceRepo.findByEmployeeAndYear.mockResolvedValue(mockBalances as any);
      
      const result = await balanceService.getBalancesForEmployee('emp1', 2023);
      expect(result).toEqual(mockBalances);
    });
  });

  describe('updateBalance', () => {
    it('should successfully update a balance', async () => {
      const currentBalance = { id: 'bal1', leaveTypeId: 'lt1', totalDays: 20, usedDays: 5 };
      const updatedBalance = { ...currentBalance, usedDays: 10 };
      const policy = { allowNegativeBalance: false };
      
      balanceRepo.findById.mockResolvedValue(currentBalance as any);
      policyService.getPolicyByLeaveTypeId.mockResolvedValue(policy as any);
      balanceRepo.updateUsedDays.mockResolvedValue(updatedBalance as any);
      auditRepo.createAuditLog.mockResolvedValue({} as any);

      const result = await balanceService.updateBalance('bal1', 10);
      expect(result).toEqual(updatedBalance);
      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal1', 10);
    });

    it('should throw an error on policy constraint violation', async () => {
      const currentBalance = { id: 'bal1', leaveTypeId: 'lt1', totalDays: 20, usedDays: 5 };
      const policy = { allowNegativeBalance: false };
      
      balanceRepo.findById.mockResolvedValue(currentBalance as any);
      policyService.getPolicyByLeaveTypeId.mockResolvedValue(policy as any);

      await expect(balanceService.updateBalance('bal1', 25)).rejects.toThrow('Policy constraint violation');
    });
  });
});
