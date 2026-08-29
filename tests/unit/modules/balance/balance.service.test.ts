jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { BalanceService } from '../../../../src/modules/balance/balance.service';
import {
  ILeaveBalanceRepository,
  LeaveBalance
} from '../../../../src/modules/balance/balance.model';
import {
  InsufficientBalanceError,
  NotFoundError
} from '../../../../src/shared/types/errors';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    fiscalYear: 2026,
    totalEntitlement: 20,
    usedDays: 3,
    pendingDays: 5,
    remainingDays: 12,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('BalanceService', () => {
  let repository: jest.Mocked<ILeaveBalanceRepository>;
  let service: BalanceService;
  let balance: LeaveBalance;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmployeePolicyAndYear: jest.fn(),
      findByEmployeeAndYear: jest.fn()
    };
    repository.update.mockImplementation(async (b) => b);
    service = new BalanceService(repository);
    balance = makeBalance();
  });

  describe('getAvailableDays', () => {
    it('derives availability purely: entitlementDays - usedDays - pendingDays', () => {
      expect(service.getAvailableDays(makeBalance())).toBe(20 - 3 - 5);
    });

    it('never consults a stored remainingDays field', () => {
      const withStale = makeBalance({ remainingDays: 0 });
      expect(service.getAvailableDays(withStale)).toBe(12);
    });
  });

  describe('reserve (SUBMIT)', () => {
    it('throws NotFoundError when the balance is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.reserve('missing', 1)).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it('throws InsufficientBalanceError for negative days', async () => {
      repository.findById.mockResolvedValue(balance);

      await expect(service.reserve('bal-1', -1)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('throws InsufficientBalanceError when days exceed availability', async () => {
      repository.findById.mockResolvedValue(balance); // available = 12

      await expect(service.reserve('bal-1', 13)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('increments pendingDays and leaves usedDays unchanged', async () => {
      repository.findById.mockResolvedValue(balance);

      const result = await service.reserve('bal-1', 2);

      expect(result.pendingDays).toBe(7); // 5 + 2
      expect(result.usedDays).toBe(3);
    });
  });

  describe('approve', () => {
    it('throws InsufficientBalanceError when there are not enough pending days', async () => {
      repository.findById.mockResolvedValue(makeBalance({ pendingDays: 2 }));

      await expect(service.approve('bal-1', 3)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('throws InsufficientBalanceError for negative days', async () => {
      repository.findById.mockResolvedValue(balance);

      await expect(service.approve('bal-1', -1)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('moves days from pending to used', async () => {
      repository.findById.mockResolvedValue(balance);

      const result = await service.approve('bal-1', 2);

      expect(result.pendingDays).toBe(3); // 5 - 2
      expect(result.usedDays).toBe(5); // 3 + 2
    });
  });

  describe('reject (PENDING)', () => {
    it('releases pending days', async () => {
      repository.findById.mockResolvedValue(balance);

      const result = await service.reject('bal-1', 2);

      expect(result.pendingDays).toBe(3); // 5 - 2
      expect(result.usedDays).toBe(3);
    });

    it('throws when pendingDays < days (never clamps)', async () => {
      repository.findById.mockResolvedValue(makeBalance({ pendingDays: 0 }));

      await expect(service.reject('bal-1', 1)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });
  });

  describe('cancel (PENDING)', () => {
    it('releases pending days', async () => {
      repository.findById.mockResolvedValue(balance);

      const result = await service.cancel('bal-1', 2, 'PENDING');

      expect(result.pendingDays).toBe(3);
      expect(result.usedDays).toBe(3);
    });

    it('throws without clamping when pendingDays < days', async () => {
      repository.findById.mockResolvedValue(makeBalance({ pendingDays: 1 }));

      await expect(service.cancel('bal-1', 2, 'PENDING')).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('throws for negative days', async () => {
      repository.findById.mockResolvedValue(balance);

      await expect(service.cancel('bal-1', -1, 'PENDING')).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });
  });

  describe('cancel (APPROVED)', () => {
    it('restores used days', async () => {
      repository.findById.mockResolvedValue(balance);

      const result = await service.cancel('bal-1', 2, 'APPROVED');

      expect(result.usedDays).toBe(1); // 3 - 2
      expect(result.pendingDays).toBe(5);
    });

    it('throws without clamping when usedDays < days', async () => {
      repository.findById.mockResolvedValue(makeBalance({ usedDays: 0 }));

      await expect(service.cancel('bal-1', 1, 'APPROVED')).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });
  });

  describe('status recomputation on write', () => {
    it('marks EXHAUSTED when availability reaches zero', async () => {
      repository.findById.mockResolvedValue(
        makeBalance({ totalEntitlement: 6, usedDays: 0, pendingDays: 6 })
      );

      const result = await service.approve('bal-1', 6);

      expect(result.status).toBe('EXHAUSTED');
    });

    it('preserves CLOSED status', async () => {
      repository.findById.mockResolvedValue(makeBalance({ status: 'CLOSED' }));

      const result = await service.reject('bal-1', 1);

      expect(result.status).toBe('CLOSED');
    });
  });
});
