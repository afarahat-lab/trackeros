import { BalanceService } from '../../../../src/modules/balance/balance.service';
import { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { IAuditService } from '../../../../src/modules/audit/audit.service';
import { BalanceStatus } from '../../../../src/modules/balance/balance.model';
import { AuditAction } from '../../../../src/shared/types';

describe('BalanceService', () => {
  let service: BalanceService;
  let mockRepo: any;
  let mockAudit: jest.Mocked<IAuditService>;

  const mockBalance = {
    id: '1',
    employeeId: 'emp1',
    policyId: 'pol1',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2023,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployee: jest.fn(),
      findAll: jest.fn(),
      deductDays: jest.fn(),
      restoreDays: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockAudit = {
      recordAction: jest.fn(),
    } as any;

    service = new BalanceService(mockRepo, mockAudit);
  });

  it('should get all balances', async () => {
    mockRepo.findAll.mockResolvedValue([mockBalance]);
    const result = await service.getAllBalances();
    expect(result).toEqual([mockBalance]);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('should get balance by employee and policy', async () => {
    mockRepo.findByEmployeeAndPolicy.mockResolvedValue(mockBalance);
    const result = await service.getBalance('emp1', 'pol1', 2023);
    expect(result).toEqual(mockBalance);
  });

  it('should get balances by employee', async () => {
    mockRepo.findByEmployee.mockResolvedValue([mockBalance]);
    const result = await service.getBalancesByEmployee('emp1');
    expect(result).toEqual([mockBalance]);
  });

  it('should deduct balance and update status to EXHAUSTED', async () => {
    mockRepo.findByEmployee.mockResolvedValue([{ ...mockBalance, remainingDays: 5 }]);
    const updatedBalance = { ...mockBalance, usedDays: 10, remainingDays: 0, status: BalanceStatus.EXHAUSTED };
    mockRepo.update.mockResolvedValue(updatedBalance);

    const result = await service.deductBalance('emp1', 'pol1', 5);

    expect(result.status).toBe(BalanceStatus.EXHAUSTED);
    expect(mockRepo.update).toHaveBeenCalledWith('1', expect.objectContaining({
      usedDays: 10,
      remainingDays: 0,
      status: BalanceStatus.EXHAUSTED
    }));
    expect(mockAudit.recordAction).toHaveBeenCalledWith(
      'leave_balances',
      '1',
      AuditAction.UPDATE,
      null,
      expect.any(Object)
    );
  });

  it('should restore balance and update status to ACTIVE', async () => {
    const exhaustedBalance = { ...mockBalance, usedDays: 20, remainingDays: 0, status: BalanceStatus.EXHAUSTED };
    mockRepo.findByEmployee.mockResolvedValue([exhaustedBalance]);
    const updatedBalance = { ...exhaustedBalance, usedDays: 15, remainingDays: 5, status: BalanceStatus.ACTIVE };
    mockRepo.update.mockResolvedValue(updatedBalance);

    const result = await service.restoreBalance('emp1', 'pol1', 5);

    expect(result.status).toBe(BalanceStatus.ACTIVE);
    expect(mockRepo.update).toHaveBeenCalledWith('1', expect.objectContaining({
      usedDays: 15,
      remainingDays: 5,
      status: BalanceStatus.ACTIVE
    }));
    expect(mockAudit.recordAction).toHaveBeenCalledWith(
      'leave_balances',
      '1',
      AuditAction.UPDATE,
      null,
      expect.any(Object)
    );
  });

  it('should initialize balance and record audit', async () => {
    const newBalance = { ...mockBalance, id: '2', status: BalanceStatus.INITIALIZED };
    mockRepo.create.mockResolvedValue(newBalance);

    const result = await service.initializeBalance('emp1', 'pol1', 2024);

    expect(result.status).toBe(BalanceStatus.INITIALIZED);
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockAudit.recordAction).toHaveBeenCalledWith(
      'leave_balances',
      '2',
      AuditAction.CREATE,
      null,
      expect.any(Object)
    );
  });
});
