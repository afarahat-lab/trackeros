import { BalanceService, ValidationError } from '../../../../src/modules/balance/balance.service';
import { IBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance, BalanceStatus } from '../../../../src/modules/balance/balance.model';
import { CreateBalanceDto } from '../../../../src/modules/balance/balance.service.interface';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'balance-1',
    employeeId: 'emp-1',
    leavePolicyId: 'policy-1',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: BalanceStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<IBalanceRepository> {
  return {
    findById: jest.fn(),
    findByEmployee: jest.fn(),
    findByEmployeeAndPolicy: jest.fn(),
    findByEmployeeAndFiscalYear: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('BalanceService', () => {
  let service: BalanceService;
  let repo: jest.Mocked<IBalanceRepository>;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new BalanceService(repo);
  });

  describe('getById', () => {
    it('should return balance when found', async () => {
      const balance = makeBalance();
      repo.findById.mockResolvedValue(balance);

      const result = await service.getById('balance-1');
      expect(result).toEqual(balance);
      expect(repo.findById).toHaveBeenCalledWith('balance-1');
    });

    it('should return null when not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getByEmployee', () => {
    it('should return balances for an employee', async () => {
      const balances = [makeBalance(), makeBalance({ id: 'balance-2', leavePolicyId: 'policy-2' })];
      repo.findByEmployee.mockResolvedValue(balances);

      const result = await service.getByEmployee('emp-1');
      expect(result).toEqual(balances);
      expect(repo.findByEmployee).toHaveBeenCalledWith('emp-1');
    });

    it('should return empty array when no balances', async () => {
      repo.findByEmployee.mockResolvedValue([]);

      const result = await service.getByEmployee('emp-1');
      expect(result).toEqual([]);
    });
  });

  describe('getByEmployeeAndPolicy', () => {
    it('should return balance for employee+policy', async () => {
      const balance = makeBalance();
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.getByEmployeeAndPolicy('emp-1', 'policy-1');
      expect(result).toEqual(balance);
      expect(repo.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-1', 'policy-1');
    });

    it('should return null when not found', async () => {
      repo.findByEmployeeAndPolicy.mockResolvedValue(null);

      const result = await service.getByEmployeeAndPolicy('emp-1', 'policy-1');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const validDto: CreateBalanceDto = {
      employeeId: 'emp-1',
      leavePolicyId: 'policy-1',
      totalEntitlement: 20,
      fiscalYear: 2026,
    };

    it('should create a balance with valid data', async () => {
      const created = makeBalance();
      repo.create.mockResolvedValue(created);

      const result = await service.create(validDto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        leavePolicyId: 'policy-1',
        totalEntitlement: 20,
        usedDays: 0,
        remainingDays: 20,
        fiscalYear: 2026,
        status: BalanceStatus.ACTIVE,
      });
    });

    it('should floor fractional totalEntitlement', async () => {
      const created = makeBalance({ totalEntitlement: 15, remainingDays: 15 });
      repo.create.mockResolvedValue(created);

      await service.create({ ...validDto, totalEntitlement: 15.7 });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalEntitlement: 15, remainingDays: 15 }),
      );
    });

    it('should reject when employeeId is empty', async () => {
      await expect(service.create({ ...validDto, employeeId: '' }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, employeeId: '  ' }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when leavePolicyId is empty', async () => {
      await expect(service.create({ ...validDto, leavePolicyId: '' }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when totalEntitlement is not positive', async () => {
      await expect(service.create({ ...validDto, totalEntitlement: 0 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, totalEntitlement: -5 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, totalEntitlement: NaN }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, totalEntitlement: Infinity }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when fiscalYear is not a positive integer', async () => {
      await expect(service.create({ ...validDto, fiscalYear: 0 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, fiscalYear: -2026 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, fiscalYear: 2026.5 }))
        .rejects.toThrow(ValidationError);
    });

    it('should trim whitespace from employeeId and leavePolicyId', async () => {
      const created = makeBalance();
      repo.create.mockResolvedValue(created);

      await service.create({ ...validDto, employeeId: '  emp-1  ', leavePolicyId: '  policy-1  ' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-1', leavePolicyId: 'policy-1' }),
      );
    });
  });

  describe('deductDays', () => {
    it('should deduct days and recalculate remainingDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 0, remainingDays: 20 });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.deductDays('balance-1', 5);
      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 5,
        remainingDays: 15,
        status: BalanceStatus.ACTIVE,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should transition to EXHAUSTED when remainingDays reaches 0', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 15, remainingDays: 5 });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 20, remainingDays: 0, status: BalanceStatus.EXHAUSTED });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.deductDays('balance-1', 5);
      expect(result.status).toBe(BalanceStatus.EXHAUSTED);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 20,
        remainingDays: 0,
        status: BalanceStatus.EXHAUSTED,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should floor fractional days', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 0, remainingDays: 20 });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 3, remainingDays: 17 });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      await service.deductDays('balance-1', 3.7);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 3,
        remainingDays: 17,
        status: BalanceStatus.ACTIVE,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should throw when days <= 0', async () => {
      await expect(service.deductDays('balance-1', 0))
        .rejects.toThrow(ValidationError);
      await expect(service.deductDays('balance-1', -1))
        .rejects.toThrow(ValidationError);
      await expect(service.deductDays('balance-1', NaN))
        .rejects.toThrow(ValidationError);
    });

    it('should throw when balance not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.deductDays('nonexistent', 5))
        .rejects.toThrow(ValidationError);
    });

    it('should throw when balance is CLOSED', async () => {
      const balance = makeBalance({ status: BalanceStatus.CLOSED });
      repo.findById.mockResolvedValue(balance);

      await expect(service.deductDays('balance-1', 5))
        .rejects.toThrow('Cannot deduct from a CLOSED balance');
    });

    it('should throw when balance is EXHAUSTED', async () => {
      const balance = makeBalance({ status: BalanceStatus.EXHAUSTED, remainingDays: 0 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.deductDays('balance-1', 5))
        .rejects.toThrow('Cannot deduct from a non-ACTIVE balance');
    });

    it('should throw when insufficient remainingDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 18, remainingDays: 2 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.deductDays('balance-1', 5))
        .rejects.toThrow('Insufficient balance');
    });

    it('should never produce negative remainingDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 19, remainingDays: 1 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.deductDays('balance-1', 2))
        .rejects.toThrow('Insufficient balance');
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('restoreDays', () => {
    it('should restore days and recalculate remainingDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.restoreDays('balance-1', 5);
      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 5,
        remainingDays: 15,
        status: BalanceStatus.ACTIVE,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should transition from EXHAUSTED back to ACTIVE when remainingDays > 0', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 20, remainingDays: 0, status: BalanceStatus.EXHAUSTED });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 15, remainingDays: 5, status: BalanceStatus.ACTIVE });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.restoreDays('balance-1', 5);
      expect(result.status).toBe(BalanceStatus.ACTIVE);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 15,
        remainingDays: 5,
        status: BalanceStatus.ACTIVE,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should floor fractional days', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 7, remainingDays: 13 });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      await service.restoreDays('balance-1', 3.7);
      expect(repo.update).toHaveBeenCalledWith('balance-1', {
        usedDays: 7,
        remainingDays: 13,
        status: BalanceStatus.ACTIVE,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should throw when days <= 0', async () => {
      await expect(service.restoreDays('balance-1', 0))
        .rejects.toThrow(ValidationError);
      await expect(service.restoreDays('balance-1', -1))
        .rejects.toThrow(ValidationError);
      await expect(service.restoreDays('balance-1', NaN))
        .rejects.toThrow(ValidationError);
    });

    it('should throw when balance not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.restoreDays('nonexistent', 5))
        .rejects.toThrow(ValidationError);
    });

    it('should throw when balance is CLOSED', async () => {
      const balance = makeBalance({ status: BalanceStatus.CLOSED, usedDays: 10 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.restoreDays('balance-1', 5))
        .rejects.toThrow('Cannot restore to a CLOSED balance');
    });

    it('should throw when usedDays < days (cannot restore more than used)', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 3, remainingDays: 17 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.restoreDays('balance-1', 5))
        .rejects.toThrow('Cannot restore 5 days: only 3 days used');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should never produce negative usedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 0, remainingDays: 20 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.restoreDays('balance-1', 1))
        .rejects.toThrow('Cannot restore 1 days: only 0 days used');
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance exists and remainingDays >= requestedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 10);
      expect(result).toBe(true);
    });

    it('should return true when remainingDays exactly equals requestedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 10);
      expect(result).toBe(true);
    });

    it('should return false when remainingDays < requestedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 18, remainingDays: 2 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 5);
      expect(result).toBe(false);
    });

    it('should return false when no balance exists (never throws)', async () => {
      repo.findByEmployeeAndPolicy.mockResolvedValue(null);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 5);
      expect(result).toBe(false);
    });

    it('should return false when balance is EXHAUSTED', async () => {
      const balance = makeBalance({ status: BalanceStatus.EXHAUSTED, remainingDays: 0 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 1);
      expect(result).toBe(false);
    });

    it('should return false when balance is CLOSED', async () => {
      const balance = makeBalance({ status: BalanceStatus.CLOSED, remainingDays: 10 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 5);
      expect(result).toBe(false);
    });

    it('should floor fractional requestedDays', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 5, remainingDays: 15 });
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      const result = await service.hasSufficientBalance('emp-1', 'policy-1', 10.7);
      expect(result).toBe(true);
    });

    it('should be idempotent (no side effects)', async () => {
      const balance = makeBalance();
      repo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await service.hasSufficientBalance('emp-1', 'policy-1', 5);
      await service.hasSufficientBalance('emp-1', 'policy-1', 5);

      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    it('ACTIVE → EXHAUSTED on deduction to zero', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 15, remainingDays: 5, status: BalanceStatus.ACTIVE });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 20, remainingDays: 0, status: BalanceStatus.EXHAUSTED });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.deductDays('balance-1', 5);
      expect(result.status).toBe(BalanceStatus.EXHAUSTED);
    });

    it('EXHAUSTED → ACTIVE on restoration', async () => {
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 20, remainingDays: 0, status: BalanceStatus.EXHAUSTED });
      const updated = makeBalance({ totalEntitlement: 20, usedDays: 15, remainingDays: 5, status: BalanceStatus.ACTIVE });
      repo.findById.mockResolvedValue(balance);
      repo.update.mockResolvedValue(updated);

      const result = await service.restoreDays('balance-1', 5);
      expect(result.status).toBe(BalanceStatus.ACTIVE);
    });

    it('CLOSED rejects deduction', async () => {
      const balance = makeBalance({ status: BalanceStatus.CLOSED, remainingDays: 10 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.deductDays('balance-1', 5))
        .rejects.toThrow('Cannot deduct from a CLOSED balance');
    });

    it('CLOSED rejects restoration', async () => {
      const balance = makeBalance({ status: BalanceStatus.CLOSED, usedDays: 10 });
      repo.findById.mockResolvedValue(balance);

      await expect(service.restoreDays('balance-1', 5))
        .rejects.toThrow('Cannot restore to a CLOSED balance');
    });
  });
});
