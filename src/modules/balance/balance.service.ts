import { LeaveTypeCode } from '../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors';
import { IUnitOfWork, PgUnitOfWork } from '../../shared/db';
import { addMonths, periodContaining } from '../../shared/date/accrual';
import { IEmployeeService, EmployeeService, PgEmployeeRepository } from '../employee';
import { IPolicyService, PolicyService, PgLeavePolicyRepository } from '../policy';
import { ILeaveTypeService, LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';
import { LeaveBalance, CreateLeaveBalanceInput } from './balance.model';
import { IBalanceRepository, PgLeaveBalanceRepository } from './balance.repository';

export interface OpenBalancePeriodInput {
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  periodStart: Date;
  periodEnd: Date;
}

export interface CarryForwardInput {
  sourceBalanceId: string;
}

/**
 * A read-only projection of a single `LeaveBalance` row for the caller's current
 * accrual period. `available` is derived from the persisted counters — it is never
 * stored.
 */
export interface BalanceEntry {
  leaveTypeCode: LeaveTypeCode;
  periodStart: Date;
  periodEnd: Date;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  available: number;
}

export interface IBalanceService {
  openPeriod(input: OpenBalancePeriodInput): Promise<LeaveBalance>;
  carryForward(input: CarryForwardInput): Promise<LeaveBalance>;
  getBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    periodStart: Date,
    periodEnd: Date
  ): Promise<LeaveBalance | null>;
  getBalanceById(id: string): Promise<LeaveBalance>;
  getBalanceForEmployee(employeeId: string): Promise<BalanceEntry[]>;
}

export class BalanceService implements IBalanceService {
  constructor(
    private readonly repository: IBalanceRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
    private readonly leaveTypeService: ILeaveTypeService,
    private readonly uow: IUnitOfWork
  ) {}

  async openPeriod(input: OpenBalancePeriodInput): Promise<LeaveBalance> {
    this.validateOpenInput(input);

    return this.uow.withTransaction(async (client) => {
      await this.employeeService.getEmployeeById(input.employeeId);

      const policy = await this.policyService.getPolicyByLeaveTypeCode(input.leaveTypeCode);

      // Grant the FULL entitlement at the start of the period (no pro-rata).
      if (policy.annualEntitlementDays <= 0) {
        throw new ValidationError('Invalid entitlement');
      }

      const existing = await this.repository.findByKey(
        input.employeeId,
        input.leaveTypeCode,
        input.periodStart,
        input.periodEnd,
        client
      );
      if (existing) {
        throw new ConflictError('Leave balance already exists for this period');
      }

      const balance: CreateLeaveBalanceInput = {
        employeeId: input.employeeId,
        leaveTypeCode: input.leaveTypeCode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        entitledDays: policy.annualEntitlementDays,
        usedDays: 0,
        pendingDays: 0,
      };

      return this.repository.create(balance, client);
    });
  }

  async carryForward(input: CarryForwardInput): Promise<LeaveBalance> {
    if (typeof input.sourceBalanceId !== 'string' || input.sourceBalanceId.trim() === '') {
      throw new ValidationError('Invalid sourceBalanceId');
    }

    return this.uow.withTransaction(async (client) => {
      const source = await this.repository.findById(input.sourceBalanceId, client);
      if (!source) {
        throw new NotFoundError('Leave balance not found');
      }

      const policy = await this.policyService.getPolicyByLeaveTypeCode(source.leaveTypeCode);

      // OPEN vs CLOSED is inferred from the period boundaries relative to now.
      if (source.periodEnd.getTime() > Date.now()) {
        throw new ValidationError('Period is not closable');
      }

      if (source.entitledDays < 0 || source.usedDays < 0 || source.pendingDays < 0) {
        throw new ValidationError('Balance counters must be non-negative');
      }

      const unused = source.entitledDays - source.usedDays - source.pendingDays;
      if (unused < 0) {
        throw new ValidationError('Balance counters exceed entitlement');
      }

      // Hard cap: days above carryForwardDays are forfeited.
      const carry = Math.min(unused, policy.carryForwardDays);

      const nextPeriodStart = source.periodEnd;
      const nextPeriodEnd = addMonths(source.periodEnd, policy.accrualPeriodMonths);

      const existingNext = await this.repository.findByKey(
        source.employeeId,
        source.leaveTypeCode,
        nextPeriodStart,
        nextPeriodEnd,
        client
      );

      if (existingNext) {
        return this.repository.update(
          existingNext.id,
          {
            entitledDays: existingNext.entitledDays + carry,
          },
          client
        );
      }

      const nextBalance: CreateLeaveBalanceInput = {
        employeeId: source.employeeId,
        leaveTypeCode: source.leaveTypeCode,
        periodStart: nextPeriodStart,
        periodEnd: nextPeriodEnd,
        entitledDays: policy.annualEntitlementDays + carry,
        usedDays: 0,
        pendingDays: 0,
      };

      return this.repository.create(nextBalance, client);
    });
  }

  async getBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    periodStart: Date,
    periodEnd: Date
  ): Promise<LeaveBalance | null> {
    return this.repository.findByKey(employeeId, leaveTypeCode, periodStart, periodEnd);
  }

  async getBalanceById(id: string): Promise<LeaveBalance> {
    const balance = await this.repository.findById(id);
    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }
    return balance;
  }

  async getBalanceForEmployee(employeeId: string): Promise<BalanceEntry[]> {
    const employee = await this.employeeService.getEmployeeById(employeeId);
    const leaveTypes = await this.leaveTypeService.getAllLeaveTypes();
    const now = new Date();

    const entries: BalanceEntry[] = [];
    for (const leaveType of leaveTypes) {
      const policy = await this.policyService.getPolicyByLeaveTypeCode(leaveType.code);
      const period = periodContaining(employee.hireDate, policy.accrualPeriodMonths, now);
      const balance = await this.repository.findByKey(
        employeeId,
        leaveType.code,
        period.start,
        period.end,
      );

      // A leave type with no opened period yet has no balance to report.
      if (!balance) {
        continue;
      }

      entries.push({
        leaveTypeCode: balance.leaveTypeCode,
        periodStart: balance.periodStart,
        periodEnd: balance.periodEnd,
        entitledDays: balance.entitledDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        available: balance.entitledDays - balance.usedDays - balance.pendingDays,
      });
    }

    return entries;
  }

  private validateOpenInput(input: OpenBalancePeriodInput): void {
    if (typeof input.employeeId !== 'string' || input.employeeId.trim() === '') {
      throw new ValidationError('Invalid employeeId');
    }

    if (!Object.values(LeaveTypeCode).includes(input.leaveTypeCode)) {
      throw new ValidationError('Invalid leaveTypeCode');
    }

    if (!(input.periodStart instanceof Date) || Number.isNaN(input.periodStart.getTime())) {
      throw new ValidationError('Invalid periodStart');
    }

    if (!(input.periodEnd instanceof Date) || Number.isNaN(input.periodEnd.getTime())) {
      throw new ValidationError('Invalid periodEnd');
    }

    if (input.periodStart.getTime() >= input.periodEnd.getTime()) {
      throw new ValidationError('periodStart must be before periodEnd');
    }
  }
}

/**
 * Convenience factory wiring the concrete PostgreSQL-backed collaborators the
 * routes layer needs so route handlers construct a single service instance.
 */
export function createBalanceService(): IBalanceService {
  const leaveTypeService = new LeaveTypeService(new PgLeaveTypeRepository());
  return new BalanceService(
    new PgLeaveBalanceRepository(),
    new EmployeeService(new PgEmployeeRepository()),
    new PolicyService(new PgLeavePolicyRepository(), leaveTypeService),
    leaveTypeService,
    new PgUnitOfWork(),
  );
}
