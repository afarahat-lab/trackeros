import { PoolClient } from 'pg';
import {
  BalanceService,
  computeAvailableDays,
  CreateLeaveBalanceInput,
  LeaveBalance,
  NegativeBalanceCounterError,
  PgLeaveBalanceRepository,
} from '../../../../src/modules/balance';
import { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.model';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 3,
    remainingDays: 17,
    fiscalYear: 2025,
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createInput(
  overrides: Partial<CreateLeaveBalanceInput> = {},
): CreateLeaveBalanceInput {
  const balance = makeBalance();
  return {
    employeeId: balance.employeeId,
    policyId: balance.policyId,
    totalEntitlement: balance.totalEntitlement,
    usedDays: balance.usedDays,
    remainingDays: balance.remainingDays,
    fiscalYear: balance.fiscalYear,
    status: balance.status,
    ...overrides,
  };
}

describe('BalanceService', () => {
  let balances: jest.Mocked<ILeaveBalanceRepository>;
  let uow: jest.Mocked<IUnitOfWork>;
  let service: BalanceService;
  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    balances = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      deduct: jest.fn(),
      restore: jest.fn(),
    };
    uow = {
      withTransaction: jest.fn(),
    };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new BalanceService(balances as unknown as PgLeaveBalanceRepository, uow);
  });

  it('create assigns id/createdAt/updatedAt and delegates to repo.create', async () => {
    const input = createInput();
    balances.create.mockResolvedValue(makeBalance());

    const result = await service.create(input);

    expect(balances.create).toHaveBeenCalledTimes(1);
    const calledWith = balances.create.mock.calls[0][0];
    expect(typeof calledWith.id).toBe('string');
    expect(calledWith.id.length).toBeGreaterThan(0);
    expect(calledWith.createdAt).toBeInstanceOf(Date);
    expect(calledWith.updatedAt).toBeInstanceOf(Date);
    expect(calledWith.employeeId).toBe(input.employeeId);
    expect(calledWith.status).toBe('ACTIVE');
    expect(result).toBeDefined();
  });

  it('findById delegates to repo.findById', async () => {
    const balance = makeBalance();
    balances.findById.mockResolvedValue(balance);

    const result = await service.findById('bal-1');

    expect(balances.findById).toHaveBeenCalledWith('bal-1', undefined);
    expect(result).toEqual(balance);
  });

  it('findByEmployee delegates to repo.findByEmployee', async () => {
    const balance = makeBalance();
    balances.findByEmployee.mockResolvedValue([balance]);

    const result = await service.findByEmployee('emp-1');

    expect(balances.findByEmployee).toHaveBeenCalledWith('emp-1', undefined);
    expect(result).toEqual([balance]);
  });

  it('deduct wraps the repository call in a transaction', async () => {
    const balance = makeBalance({ usedDays: 5, remainingDays: 15 });
    balances.deduct.mockResolvedValue(balance);

    const result = await service.deduct('bal-1', 2);

    expect(uow.withTransaction).toHaveBeenCalledTimes(1);
    expect(balances.deduct).toHaveBeenCalledWith('bal-1', 2, fakeClient);
    expect(result).toEqual(balance);
  });

  it('restore wraps the repository call in a transaction', async () => {
    const balance = makeBalance({ usedDays: 1, remainingDays: 19 });
    balances.restore.mockResolvedValue(balance);

    const result = await service.restore('bal-1', 2);

    expect(uow.withTransaction).toHaveBeenCalledTimes(1);
    expect(balances.restore).toHaveBeenCalledWith('bal-1', 2, fakeClient);
    expect(result).toEqual(balance);
  });

  it('deduct propagates NegativeBalanceCounterError when remainingDays would drop below zero', async () => {
    balances.deduct.mockRejectedValue(
      new NegativeBalanceCounterError('deduct would take remainingDays below zero'),
    );

    await expect(service.deduct('bal-1', 100)).rejects.toThrow(
      NegativeBalanceCounterError,
    );
  });

  it('deduct propagates NegativeBalanceCounterError when days is negative', async () => {
    balances.deduct.mockRejectedValue(
      new NegativeBalanceCounterError('days cannot be negative'),
    );

    await expect(service.deduct('bal-1', -1)).rejects.toThrow(
      NegativeBalanceCounterError,
    );
  });

  it('restore propagates NegativeBalanceCounterError when usedDays would drop below zero', async () => {
    balances.restore.mockRejectedValue(
      new NegativeBalanceCounterError('restore would take usedDays below zero'),
    );

    await expect(service.restore('bal-1', 100)).rejects.toThrow(
      NegativeBalanceCounterError,
    );
  });

  it('restore propagates NegativeBalanceCounterError when days is negative', async () => {
    balances.restore.mockRejectedValue(
      new NegativeBalanceCounterError('days cannot be negative'),
    );

    await expect(service.restore('bal-1', -1)).rejects.toThrow(
      NegativeBalanceCounterError,
    );
  });
});

describe('computeAvailableDays (derived available days)', () => {
  it('derives availableDays as totalEntitlement - usedDays - pendingDays', () => {
    expect(computeAvailableDays(20, 3, 2)).toBe(15);
  });

  it('allows a negative availableDays (no clamping) when used exceeds entitlement', () => {
    const available = computeAvailableDays(5, 8, 0);
    expect(available).toBe(-3);
  });

  it('treats pendingDays as part of the deduction', () => {
    expect(computeAvailableDays(10, 4, 6)).toBe(0);
  });
});
