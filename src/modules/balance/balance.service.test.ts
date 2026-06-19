import { BalanceService } from './balance.service';

describe('BalanceService', () => {
  let service: BalanceService;
  let balanceRepo: any;
  let auditRepo: any;
  let employeeRepo: any;

  beforeEach(() => {
    balanceRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByQuery: jest.fn(),
      updateBalance: jest.fn(),
      create: jest.fn(),
    };
    auditRepo = {
      createLeaveBalanceAudit: jest.fn(),
    };
    employeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      findManagers: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new BalanceService(balanceRepo, auditRepo, employeeRepo);
  });

  it('should get balance by employee, policy, and year', async () => {
    const mockBalance = { id: '1', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 10, usedDays: 2, remainingDays: 8, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
    balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);

    const result = await service.getBalance('e1', 'p1', 2024);
    expect(result).toEqual(mockBalance);
    expect(balanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith('e1', 'p1', 2024);
  });

  it('should throw error if parameters are missing in getBalance', async () => {
    await expect(service.getBalance('', 'p1', 2024)).rejects.toThrow('Missing required parameters');
  });

  it('should update balance and create audit log', async () => {
    const mockBalance = { id: '1', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 10, usedDays: 2, remainingDays: 8, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
    const updatedBalance = { ...mockBalance, usedDays: 4, remainingDays: 6 };
    balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);
    balanceRepo.updateBalance.mockResolvedValue(updatedBalance);

    const result = await service.updateBalance('e1', 'p1', 2024, 2);
    expect(result).toEqual(updatedBalance);
    expect(balanceRepo.updateBalance).toHaveBeenCalledWith('1', 4, 6);
    expect(auditRepo.createLeaveBalanceAudit).toHaveBeenCalled();
  });

  it('should create balance', async () => {
    const newBalance = { id: '2', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 15, usedDays: 0, remainingDays: 15, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
    balanceRepo.create.mockResolvedValue(newBalance);

    const result = await service.createBalance('e1', 'p1', 2024, 15);
    expect(result).toEqual(newBalance);
    expect(balanceRepo.create).toHaveBeenCalledWith({
      employeeId: 'e1',
      policyId: 'p1',
      fiscalYear: 2024,
      totalEntitlement: 15,
      usedDays: 0,
      remainingDays: 15,
      status: 'ACTIVE'
    });
  });

  it('should throw error if totalEntitlement is negative', async () => {
    await expect(service.createBalance('e1', 'p1', 2024, -5)).rejects.toThrow('Total entitlement cannot be negative');
  });

  it('should get balances by employee with fiscal year', async () => {
    const balances = [{ id: '1', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 10, usedDays: 0, remainingDays: 10, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }];
    balanceRepo.findByQuery.mockResolvedValue(balances);

    const result = await service.getBalancesByEmployee('e1', 2024);
    expect(result).toEqual(balances);
    expect(balanceRepo.findByQuery).toHaveBeenCalledWith({ employeeId: 'e1', fiscalYear: 2024 });
  });

  it('should get balances by employee without fiscal year', async () => {
    const balances = [{ id: '1', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 10, usedDays: 0, remainingDays: 10, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }];
    balanceRepo.findByEmployeeId.mockResolvedValue(balances);

    const result = await service.getBalancesByEmployee('e1');
    expect(result).toEqual(balances);
    expect(balanceRepo.findByEmployeeId).toHaveBeenCalledWith('e1');
  });

  it('should recalculate balance', async () => {
    const mockBalance = { id: '1', employeeId: 'e1', policyId: 'p1', fiscalYear: 2024, totalEntitlement: 10, usedDays: 3, remainingDays: 5, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
    const updatedBalance = { ...mockBalance, remainingDays: 7 };
    balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);
    balanceRepo.updateBalance.mockResolvedValue(updatedBalance);

    const result = await service.recalculateBalance('e1', 'p1', 2024);
    expect(result).toEqual(updatedBalance);
    expect(balanceRepo.updateBalance).toHaveBeenCalledWith('1', 3, 7);
  });
});
