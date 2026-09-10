import {
  LeaveBalance,
  CreateLeaveBalanceInput,
  IBalanceRepository,
  BalanceService,
  OpenBalancePeriodInput,
} from '../../../../src/modules/balance';
import { IEmployeeService, Employee } from '../../../../src/modules/employee';
import {
  IPolicyService,
  LeavePolicy,
  LeavePolicyStatus,
} from '../../../../src/modules/policy';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/shared/errors';
import { IUnitOfWork } from '../../../../src/shared/db';
import { LeaveTypeCode, EmployeeRole, EmploymentStatus } from '../../../../src/shared/types';

class FakeBalanceRepository implements IBalanceRepository {
  rows: LeaveBalance[] = [];
  private idCounter = 0;

  async create(input: CreateLeaveBalanceInput): Promise<LeaveBalance> {
    this.idCounter += 1;
    const balance: LeaveBalance = { id: `balance-${this.idCounter}`, ...input };
    this.rows.push(balance);
    return { ...balance };
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    return this.rows.find((b) => b.id === id) ?? null;
  }

  async findByKey(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    periodStart: Date,
    periodEnd: Date
  ): Promise<LeaveBalance | null> {
    return (
      this.rows.find(
        (b) =>
          b.employeeId === employeeId &&
          b.leaveTypeCode === leaveTypeCode &&
          b.periodStart.getTime() === periodStart.getTime() &&
          b.periodEnd.getTime() === periodEnd.getTime()
      ) ?? null
    );
  }

  async update(
    id: string,
    changes: Partial<Omit<LeaveBalance, 'id'>>
  ): Promise<LeaveBalance> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new NotFoundError('Leave balance not found');
    }
    this.rows[index] = { ...this.rows[index], ...changes };
    return { ...this.rows[index] };
  }
}

class FakeEmployeeService implements IEmployeeService {
  constructor(private rows: Employee[] = []) {}

  async createEmployee(): Promise<Employee> {
    throw new Error('Not implemented');
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = this.rows.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }
}

class FakePolicyService implements IPolicyService {
  constructor(private rows: LeavePolicy[] = []) {}

  async createLeavePolicy(): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }

  async getLeavePolicyById(id: string): Promise<LeavePolicy> {
    const policy = this.rows.find((p) => p.id === id);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }

  async getPolicyByLeaveTypeCode(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy> {
    const policy = this.rows.find((p) => p.leaveTypeCode === leaveTypeCode);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }
}

class FakeUnitOfWork implements IUnitOfWork {
  async withTransaction<T>(work: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
    return work({} as import('pg').PoolClient);
  }
}

function makeEmployee(id = 'emp-1'): Employee {
  return {
    id,
    employeeNumber: 'E001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'policy-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    policyName: 'Annual Leave Policy',
    annualEntitlementDays: 20,
    accrualPeriodMonths: 12,
    carryForwardDays: 5,
    minNoticeDays: 2,
    maxRequestDays: 15,
    requiresManagerApproval: true,
    effectiveFrom: new Date('2024-01-01T00:00:00Z'),
    effectiveTo: null,
    status: LeavePolicyStatus.ACTIVE,
    ...overrides,
  };
}

function makeOpenInput(
  overrides: Partial<OpenBalancePeriodInput> = {}
): OpenBalancePeriodInput {
  return {
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    periodStart: new Date('2024-01-01T00:00:00Z'),
    periodEnd: new Date('2024-12-31T00:00:00Z'),
    ...overrides,
  };
}

describe('BalanceService', () => {
  let repository: FakeBalanceRepository;
  let employeeService: FakeEmployeeService;
  let policyService: FakePolicyService;
  let uow: FakeUnitOfWork;
  let service: BalanceService;

  beforeEach(() => {
    repository = new FakeBalanceRepository();
    employeeService = new FakeEmployeeService([makeEmployee('emp-1')]);
    policyService = new FakePolicyService([makePolicy()]);
    uow = new FakeUnitOfWork();
    service = new BalanceService(repository, employeeService, policyService, uow);
  });

  describe('openPeriod (accrual)', () => {
    it('grants the full entitlement at period start regardless of elapsed time', async () => {
      const balance = await service.openPeriod(makeOpenInput());

      expect(balance.entitledDays).toBe(20);
      expect(balance.usedDays).toBe(0);
      expect(balance.pendingDays).toBe(0);
      expect(balance.employeeId).toBe('emp-1');
      expect(balance.leaveTypeCode).toBe(LeaveTypeCode.ANNUAL);
    });

    it('rejects an unknown leaveTypeCode with ValidationError', async () => {
      const input = makeOpenInput({ leaveTypeCode: 'invalid' as LeaveTypeCode });
      await expect(service.openPeriod(input)).rejects.toThrow(ValidationError);
    });

    it('rejects a non-positive entitlement via invalid policy with ValidationError', async () => {
      policyService = new FakePolicyService([
        makePolicy({ annualEntitlementDays: 0 }),
      ]);
      service = new BalanceService(repository, employeeService, policyService, uow);

      await expect(service.openPeriod(makeOpenInput())).rejects.toThrow(ValidationError);
    });

    it('rejects an invalid period range with ValidationError', async () => {
      const input = makeOpenInput({
        periodStart: new Date('2024-12-31T00:00:00Z'),
        periodEnd: new Date('2024-01-01T00:00:00Z'),
      });
      await expect(service.openPeriod(input)).rejects.toThrow(ValidationError);
    });

    it('rejects an unknown employee with NotFoundError', async () => {
      employeeService = new FakeEmployeeService([]);
      service = new BalanceService(repository, employeeService, policyService, uow);

      await expect(service.openPeriod(makeOpenInput())).rejects.toThrow(NotFoundError);
    });

    it('rejects an unknown policy (leave type) with NotFoundError', async () => {
      policyService = new FakePolicyService([]);
      service = new BalanceService(repository, employeeService, policyService, uow);

      await expect(service.openPeriod(makeOpenInput())).rejects.toThrow(NotFoundError);
    });

    it('rejects a duplicate balance for the same key with ConflictError', async () => {
      await service.openPeriod(makeOpenInput());
      await expect(service.openPeriod(makeOpenInput())).rejects.toThrow(ConflictError);
    });
  });

  describe('carryForward', () => {
    async function seedSource(partial?: Partial<LeaveBalance>): Promise<LeaveBalance> {
      // Build a closed source balance directly in the repository (period end in the past).
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        periodStart: new Date('2023-01-01T00:00:00Z'),
        periodEnd: new Date('2023-12-31T00:00:00Z'),
        entitledDays: 20,
        usedDays: 15,
        pendingDays: 0,
        ...partial,
      };
      return repository.create(input);
    }

    it('carries forward min(unused, carryForwardDays) and forfeits the remainder', async () => {
      // unused = 20 - 15 = 5; carryForwardDays = 5 -> carry 5, forfeit 0.
      await seedSource();

      const next = await service.carryForward({ sourceBalanceId: 'balance-1' });

      expect(next.entitledDays).toBe(25); // full entitlement 20 + carried 5
      expect(next.usedDays).toBe(0);
      expect(next.pendingDays).toBe(0);
      expect(next.periodStart.getTime()).toBe(new Date('2023-12-31T00:00:00Z').getTime());
    });

    it('caps the carry-forward at carryForwardDays when unused exceeds the cap', async () => {
      // unused = 20 - 2 = 18; carryForwardDays = 5 -> only 5 carried, 13 forfeited.
      await seedSource({ usedDays: 2 });

      const next = await service.carryForward({ sourceBalanceId: 'balance-1' });

      expect(next.entitledDays).toBe(25); // full entitlement 20 + cap 5
    });

    it('carries forward zero when no unused days remain', async () => {
      await seedSource({ usedDays: 20 });

      const next = await service.carryForward({ sourceBalanceId: 'balance-1' });

      expect(next.entitledDays).toBe(20); // full entitlement + 0 carried
    });

    it('throws NotFoundError when the source balance is missing', async () => {
      await expect(
        service.carryForward({ sourceBalanceId: 'missing' })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when a counter is negative', async () => {
      await seedSource({ usedDays: -1 });

      await expect(
        service.carryForward({ sourceBalanceId: 'balance-1' })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when the period is not closable (still open)', async () => {
      const future: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2099-12-31T00:00:00Z'),
        entitledDays: 20,
        usedDays: 10,
        pendingDays: 0,
      };
      const created = await repository.create(future);

      await expect(
        service.carryForward({ sourceBalanceId: created.id })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getBalance', () => {
    it('returns the matching balance without mutating counters', async () => {
      const created = await service.openPeriod(makeOpenInput());
      const before = { ...created };

      const found = await service.getBalance(
        'emp-1',
        LeaveTypeCode.ANNUAL,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T00:00:00Z')
      );

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(created).toEqual(before);
    });

    it('returns null when no balance exists', async () => {
      const found = await service.getBalance(
        'emp-1',
        LeaveTypeCode.ANNUAL,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T00:00:00Z')
      );

      expect(found).toBeNull();
    });
  });
});
