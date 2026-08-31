import { PoolClient } from 'pg';
import {
  BalanceService,
  CreateLeaveBalanceInput,
  LeaveBalance,
  NegativeBalanceCounterError,
  PgLeaveBalanceRepository,
  computeAvailableDays,
} from '../../../../src/modules/balance';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 4,
    remainingDays: 16,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

// Minimum shape of the AuditService/IAuditService surface BalanceService uses.
type AuditStub = {
  record: jest.Mock;
};

describe('BalanceService', () => {
  let balances: {
    create: jest.Mock;
    findById: jest.Mock;
    findByEmployee: jest.Mock;
    deduct: jest.Mock;
    restore: jest.Mock;
  };
  let audit: AuditStub;
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
    audit = { record: jest.fn() };
    uow = { withTransaction: jest.fn() };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new BalanceService(
      balances as unknown as PgLeaveBalanceRepository,
      audit as unknown as import('../../../../src/modules/audit').AuditService,
      uow,
    );
  });

  describe('computeAvailableDays (derived, never stored)', () => {
    it('subtracts used and pending from entitlement', () => {
      expect(computeAvailableDays(20, 4, 3)).toBe(13);
    });

    it('goes negative without clamping when entitlement is over-drawn', () => {
      expect(computeAvailableDays(5, 8, 2)).toBe(-5);
    });

    it('is zero when the counters exactly consume the entitlement', () => {
      expect(computeAvailableDays(10, 6, 4)).toBe(0);
    });
  });

  describe('create', () => {
    it('rejects negative totalEntitlement with NegativeBalanceCounterError', () => {
      expect(() =>
        service.create(createInput({ totalEntitlement: -1 })),
      ).toThrow(NegativeBalanceCounterError);
      expect(balances.create).not.toHaveBeenCalled();
    });

    it('rejects negative usedDays with NegativeBalanceCounterError', () => {
      expect(() =>
        service.create(createInput({ usedDays: -1 })),
      ).toThrow(NegativeBalanceCounterError);
      expect(balances.create).not.toHaveBeenCalled();
    });

    it('rejects negative remainingDays with NegativeBalanceCounterError', () => {
      expect(() =>
        service.create(createInput({ remainingDays: -1 })),
      ).toThrow(NegativeBalanceCounterError);
      expect(balances.create).not.toHaveBeenCalled();
    });

    it('does not store availableDays and persists only the three counters', async () => {
      const input = createInput();
      balances.create.mockResolvedValue(makeBalance());
      audit.record.mockResolvedValue({});

      const result = await service.create(input);

      const created = balances.create.mock.calls[0][0] as LeaveBalance;
      expect(created).not.toHaveProperty('availableDays');
      expect(created.totalEntitlement).toBe(input.totalEntitlement);
      expect(created.usedDays).toBe(input.usedDays);
      expect(created.remainingDays).toBe(input.remainingDays);
      expect(typeof created.id).toBe('string');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(balances.create).toHaveBeenCalledWith(created, fakeClient);
      expect(result).toBeDefined();
    });

    it('writes an audit record inside the same transaction', async () => {
      const created = makeBalance();
      balances.create.mockResolvedValue(created);
      audit.record.mockResolvedValue({});

      await service.create(createInput());

      expect(audit.record).toHaveBeenCalledTimes(1);
      const entry = audit.record.mock.calls[0][0];
      expect(entry.entityType).toBe('LEAVE_BALANCE');
      expect(entry.entityId).toBe(created.id);
      expect(entry.action).toBe('CREATE');
      expect(entry.oldValues).toBeNull();
      expect(audit.record.mock.calls[0][1]).toBe(fakeClient);
    });
  });

  describe('findById / findByEmployee', () => {
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
  });

  describe('deduct', () => {
    it('throws NegativeBalanceCounterError when deduction would take remainingDays below zero', async () => {
      const before = makeBalance({ remainingDays: 1, usedDays: 19 });
      balances.findById.mockResolvedValue(before);
      balances.deduct.mockRejectedValue(
        new NegativeBalanceCounterError(
          'deduct would take remainingDays below zero',
        ),
      );

      await expect(service.deduct('bal-1', 2)).rejects.toThrow(
        NegativeBalanceCounterError,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('deducts successfully and writes an audit record in the same transaction', async () => {
      const before = makeBalance();
      const after = makeBalance({ usedDays: 9, remainingDays: 11 });
      balances.findById.mockResolvedValue(before);
      balances.deduct.mockResolvedValue(after);
      audit.record.mockResolvedValue({});

      const result = await service.deduct('bal-1', 5);

      expect(balances.deduct).toHaveBeenCalledWith('bal-1', 5, fakeClient);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record.mock.calls[0][1]).toBe(fakeClient);
      expect(result).toEqual(after);
    });
  });

  describe('restore', () => {
    it('throws NegativeBalanceCounterError when restore would take usedDays below zero', async () => {
      const before = makeBalance({ usedDays: 0, remainingDays: 20 });
      balances.findById.mockResolvedValue(before);
      balances.restore.mockRejectedValue(
        new NegativeBalanceCounterError('restore would take usedDays below zero'),
      );

      await expect(service.restore('bal-1', 1)).rejects.toThrow(
        NegativeBalanceCounterError,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('restores successfully and writes an audit record in the same transaction', async () => {
      const before = makeBalance();
      const after = makeBalance({ usedDays: 2, remainingDays: 18 });
      balances.findById.mockResolvedValue(before);
      balances.restore.mockResolvedValue(after);
      audit.record.mockResolvedValue({});

      const result = await service.restore('bal-1', 2);

      expect(balances.restore).toHaveBeenCalledWith('bal-1', 2, fakeClient);
      expect(audit.record).toHaveBeenCalledTimes(1);
      expect(audit.record.mock.calls[0][1]).toBe(fakeClient);
      expect(result).toEqual(after);
    });
  });
});
