import { LeaveBalance, LeaveBalanceQueryParams } from '../../../../src/modules/balance/balance.model';
import { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { BalanceStatus } from '../../../../src/shared/types/leave.types';

class MockLeaveBalanceRepository implements ILeaveBalanceRepository {
  private balances: LeaveBalance[] = [];

  async findByEmployeeId(employeeId: string, params?: LeaveBalanceQueryParams): Promise<LeaveBalance[]> {
    let result = this.balances.filter((b) => b.employeeId === employeeId);
    if (params?.leavePolicyId) {
      result = result.filter((b) => b.leavePolicyId === params.leavePolicyId);
    }
    if (params?.fiscalYear !== undefined) {
      result = result.filter((b) => b.fiscalYear === params.fiscalYear);
    }
    if (params?.status) {
      result = result.filter((b) => b.status === params.status);
    }
    return result;
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    return (
      this.balances.find(
        (b) =>
          b.employeeId === employeeId &&
          b.leavePolicyId === leavePolicyId &&
          b.fiscalYear === fiscalYear,
      ) ?? null
    );
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveBalance> {
    const now = new Date();
    const newBalance: LeaveBalance = {
      ...balance,
      id: `balance-${this.balances.length + 1}`,
      createdAt: now,
      updatedAt: now,
    };
    this.balances.push(newBalance);
    return newBalance;
  }

  async update(
    id: string,
    balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeaveBalance | null> {
    const index = this.balances.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.balances[index] = {
      ...this.balances[index],
      ...balance,
      updatedAt: new Date(),
    };
    return this.balances[index];
  }

  async deductDays(id: string, days: number): Promise<LeaveBalance | null> {
    const index = this.balances.findIndex((b) => b.id === id);
    if (index === -1) return null;
    const balance = this.balances[index];
    const newUsedDays = balance.usedDays + days;
    const newRemainingDays = balance.totalEntitlement - newUsedDays - balance.pendingDays;
    this.balances[index] = {
      ...balance,
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
      updatedAt: new Date(),
    };
    return this.balances[index];
  }

  async addPendingDays(id: string, days: number): Promise<LeaveBalance | null> {
    const index = this.balances.findIndex((b) => b.id === id);
    if (index === -1) return null;
    const balance = this.balances[index];
    const newPendingDays = balance.pendingDays + days;
    const newRemainingDays = balance.totalEntitlement - balance.usedDays - newPendingDays;
    this.balances[index] = {
      ...balance,
      pendingDays: newPendingDays,
      remainingDays: newRemainingDays,
      updatedAt: new Date(),
    };
    return this.balances[index];
  }
}

const makeBalanceData = (
  overrides?: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>,
): Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> => ({
  employeeId: 'emp-1',
  leavePolicyId: 'policy-1',
  totalEntitlement: 20,
  usedDays: 0,
  remainingDays: 20,
  pendingDays: 0,
  fiscalYear: 2026,
  status: BalanceStatus.ACTIVE,
  ...overrides,
});

describe('ILeaveBalanceRepository', () => {
  let repo: ILeaveBalanceRepository;

  beforeEach(() => {
    repo = new MockLeaveBalanceRepository();
  });

  describe('create', () => {
    it('should create a balance and return it with generated id and timestamps', async () => {
      const input = makeBalanceData();
      const result = await repo.create(input);

      expect(result.id).toBeDefined();
      expect(result.employeeId).toBe(input.employeeId);
      expect(result.leavePolicyId).toBe(input.leavePolicyId);
      expect(result.totalEntitlement).toBe(input.totalEntitlement);
      expect(result.usedDays).toBe(input.usedDays);
      expect(result.remainingDays).toBe(input.remainingDays);
      expect(result.pendingDays).toBe(input.pendingDays);
      expect(result.fiscalYear).toBe(input.fiscalYear);
      expect(result.status).toBe(input.status);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all balances for an employee', async () => {
      await repo.create(makeBalanceData({ employeeId: 'emp-1' }));
      await repo.create(
        makeBalanceData({ employeeId: 'emp-1', leavePolicyId: 'policy-2', fiscalYear: 2027 }),
      );

      const results = await repo.findByEmployeeId('emp-1');
      expect(results).toHaveLength(2);
    });

    it('should filter by leavePolicyId', async () => {
      await repo.create(makeBalanceData({ employeeId: 'emp-1', leavePolicyId: 'policy-1' }));
      await repo.create(makeBalanceData({ employeeId: 'emp-1', leavePolicyId: 'policy-2' }));

      const results = await repo.findByEmployeeId('emp-1', { leavePolicyId: 'policy-2' });
      expect(results).toHaveLength(1);
      expect(results[0].leavePolicyId).toBe('policy-2');
    });

    it('should filter by fiscalYear', async () => {
      await repo.create(makeBalanceData({ employeeId: 'emp-1', fiscalYear: 2026 }));
      await repo.create(makeBalanceData({ employeeId: 'emp-1', fiscalYear: 2027 }));

      const results = await repo.findByEmployeeId('emp-1', { fiscalYear: 2027 });
      expect(results).toHaveLength(1);
      expect(results[0].fiscalYear).toBe(2027);
    });

    it('should filter by status', async () => {
      await repo.create(makeBalanceData({ employeeId: 'emp-1', status: BalanceStatus.ACTIVE }));
      await repo.create(
        makeBalanceData({ employeeId: 'emp-1', status: BalanceStatus.EXHAUSTED, leavePolicyId: 'policy-2' }),
      );

      const results = await repo.findByEmployeeId('emp-1', { status: BalanceStatus.EXHAUSTED });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(BalanceStatus.EXHAUSTED);
    });

    it('should return empty array when employee has no balances', async () => {
      const results = await repo.findByEmployeeId('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should return the balance when it exists', async () => {
      const created = await repo.create(makeBalanceData());
      const found = await repo.findByEmployeeAndPolicy('emp-1', 'policy-1', 2026);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.employeeId).toBe('emp-1');
      expect(found!.leavePolicyId).toBe('policy-1');
      expect(found!.fiscalYear).toBe(2026);
    });

    it('should return null when no matching balance exists', async () => {
      const found = await repo.findByEmployeeAndPolicy('emp-1', 'policy-1', 2026);
      expect(found).toBeNull();
    });

    it('should return null when employeeId matches but policyId does not', async () => {
      await repo.create(makeBalanceData());
      const found = await repo.findByEmployeeAndPolicy('emp-1', 'policy-other', 2026);
      expect(found).toBeNull();
    });

    it('should return null when fiscalYear does not match', async () => {
      await repo.create(makeBalanceData());
      const found = await repo.findByEmployeeAndPolicy('emp-1', 'policy-1', 2025);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing balance and return it', async () => {
      const created = await repo.create(makeBalanceData());
      const updated = await repo.update(created.id, {
        totalEntitlement: 25,
        remainingDays: 25,
      });

      expect(updated).not.toBeNull();
      expect(updated!.totalEntitlement).toBe(25);
      expect(updated!.remainingDays).toBe(25);
      expect(updated!.employeeId).toBe(created.employeeId);
    });

    it('should return null when the balance does not exist', async () => {
      const updated = await repo.update('nonexistent', { totalEntitlement: 30 });
      expect(updated).toBeNull();
    });
  });

  describe('deductDays', () => {
    it('should increment usedDays and decrement remainingDays', async () => {
      const created = await repo.create(
        makeBalanceData({ totalEntitlement: 20, usedDays: 2, remainingDays: 18, pendingDays: 0 }),
      );

      const result = await repo.deductDays(created.id, 3);

      expect(result).not.toBeNull();
      expect(result!.usedDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
    });

    it('should return null when the balance does not exist', async () => {
      const result = await repo.deductDays('nonexistent', 1);
      expect(result).toBeNull();
    });
  });

  describe('addPendingDays', () => {
    it('should increment pendingDays and decrement remainingDays', async () => {
      const created = await repo.create(
        makeBalanceData({ totalEntitlement: 20, usedDays: 0, remainingDays: 20, pendingDays: 0 }),
      );

      const result = await repo.addPendingDays(created.id, 5);

      expect(result).not.toBeNull();
      expect(result!.pendingDays).toBe(5);
      expect(result!.remainingDays).toBe(15);
    });

    it('should return null when the balance does not exist', async () => {
      const result = await repo.addPendingDays('nonexistent', 1);
      expect(result).toBeNull();
    });
  });
});
