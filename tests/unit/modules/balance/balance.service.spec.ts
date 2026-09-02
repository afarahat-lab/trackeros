import { LeaveBalanceService } from '../../../../src/modules/balance/balance.service';
import type { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import type {
  LeaveBalance,
  CreateLeaveBalanceInput,
} from '../../../../src/modules/balance/balance.model';

describe('LeaveBalanceService', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  function makeBalance(id: string, overrides: Partial<LeaveBalance> = {}): LeaveBalance {
    return {
      id,
      employeeId: 'emp-1',
      policyId: 'pol-1',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function makeRepository(): ILeaveBalanceRepository {
    return {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeAndFiscalYear: jest.fn(),
      update: jest.fn(),
      commitDays: jest.fn(),
    };
  }

  it('delegates create to the injected repository', async () => {
    const balance = makeBalance('bal-1');
    const repository = makeRepository();
    (repository.create as jest.Mock).mockResolvedValue(balance);
    const service = new LeaveBalanceService(repository);

    const input: CreateLeaveBalanceInput = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      totalEntitlement: 20,
      fiscalYear: 2026,
    };

    await expect(service.create(input)).resolves.toBe(balance);
    expect(repository.create).toHaveBeenCalledWith(input, undefined);
  });

  it('delegates findById to the injected repository', async () => {
    const balance = makeBalance('bal-1');
    const repository = makeRepository();
    (repository.findById as jest.Mock).mockResolvedValue(balance);
    const service = new LeaveBalanceService(repository);

    await expect(service.findById('bal-1')).resolves.toBe(balance);
    expect(repository.findById).toHaveBeenCalledWith('bal-1');
  });

  it('delegates findByEmployee to the injected repository', async () => {
    const balances = [makeBalance('bal-1')];
    const repository = makeRepository();
    (repository.findByEmployee as jest.Mock).mockResolvedValue(balances);
    const service = new LeaveBalanceService(repository);

    await expect(service.findByEmployee('emp-1')).resolves.toBe(balances);
    expect(repository.findByEmployee).toHaveBeenCalledWith('emp-1');
  });

  it('delegates findByEmployeeAndPolicy to the injected repository', async () => {
    const balances = [makeBalance('bal-1')];
    const repository = makeRepository();
    (repository.findByEmployeeAndPolicy as jest.Mock).mockResolvedValue(balances);
    const service = new LeaveBalanceService(repository);

    await expect(service.findByEmployeeAndPolicy('emp-1', 'pol-1')).resolves.toBe(balances);
    expect(repository.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-1', 'pol-1');
  });

  it('delegates findByEmployeeAndFiscalYear to the injected repository', async () => {
    const balance = makeBalance('bal-1');
    const repository = makeRepository();
    (repository.findByEmployeeAndFiscalYear as jest.Mock).mockResolvedValue(balance);
    const service = new LeaveBalanceService(repository);

    await expect(service.findByEmployeeAndFiscalYear('emp-1', 'pol-1', 2026)).resolves.toBe(balance);
    expect(repository.findByEmployeeAndFiscalYear).toHaveBeenCalledWith('emp-1', 'pol-1', 2026);
  });

  it('delegates update to the injected repository', async () => {
    const balance = makeBalance('bal-1', { totalEntitlement: 25 });
    const repository = makeRepository();
    (repository.update as jest.Mock).mockResolvedValue(balance);
    const service = new LeaveBalanceService(repository);

    await expect(service.update('bal-1', { totalEntitlement: 25 })).resolves.toBe(balance);
    expect(repository.update).toHaveBeenCalledWith('bal-1', { totalEntitlement: 25 }, undefined);
  });

  it('delegates commitDays to the injected repository', async () => {
    const balance = makeBalance('bal-1', { usedDays: 5, remainingDays: 15 });
    const repository = makeRepository();
    (repository.commitDays as jest.Mock).mockResolvedValue(balance);
    const service = new LeaveBalanceService(repository);

    await expect(service.commitDays('emp-1', 'pol-1', 2026, 5)).resolves.toBe(balance);
    expect(repository.commitDays).toHaveBeenCalledWith('emp-1', 'pol-1', 2026, 5, undefined);
  });
});
