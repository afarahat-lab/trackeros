import { PoolClient } from 'pg';
import { LeaveTypeCode } from '../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors';
import { periodContaining } from '../../shared/date/accrual';
import { IUnitOfWork, PgUnitOfWork } from '../../shared/db';
import { IEmployeeService, EmployeeService, PgEmployeeRepository } from '../employee';
import { IPolicyService, createPolicyService } from '../policy';
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
 * Pure value type derived from a `LeaveBalance` row for a single leave type.
 * `available` is always derived (`entitledDays - usedDays - pendingDays`), never
 * stored or independently settable, and is only produced for a leave type whose
 * current-period balance row exists.
 */
export interface BalanceSummary {
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
  getBalancesForEmployee(employeeId: string): Promise<BalanceSummary[]>;
}

export class BalanceService implements IBalanceService {
  constructor(
    private readonly repository: IBalanceRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
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
      const nextPeriodEnd = this.addMonths(source.periodEnd, policy.accrualPeriodMonths);

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

  async getBalancesForEmployee(employeeId: string): Promise<BalanceSummary[]> {
    if (typeof employeeId !== 'string' || employeeId.trim() === '') {
      throw new ValidationError('Invalid employeeId');
    }

    const employee = await this.employeeService.getEmployeeById(employeeId);
    const now = new Date();
    const policies = await this.policyService.getActivePolicies(now);

    const summaries: BalanceSummary[] = [];
    for (const policy of policies) {
      const period = periodContaining(
        employee.hireDate,
        policy.accrualPeriodMonths,
        now,
      );
      const balance = await this.repository.findByKey(
        employeeId,
        policy.leaveTypeCode,
        period.start,
        period.end,
      );
      if (!balance) {
        continue;
      }
      summaries.push({
        leaveTypeCode: balance.leaveTypeCode,
        periodStart: balance.periodStart,
        periodEnd: balance.periodEnd,
        entitledDays: balance.entitledDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        available: balance.entitledDays - balance.usedDays - balance.pendingDays,
      });
    }
    return summaries;
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

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }
}

/**
 * Convenience factory wiring the concrete PostgreSQL-backed collaborators the
 * routes layer needs — always via `createPolicyService()` (never hand-wired
 * policy internals).
 */
export function createBalanceService(): IBalanceService {
  return new BalanceService(
    new PgLeaveBalanceRepository(),
    new EmployeeService(new PgEmployeeRepository()),
    createPolicyService(),
    new PgUnitOfWork(),
  );
}
