import { PoolClient } from 'pg';
import { LeaveTypeCode } from '../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors';
import { IUnitOfWork, PgUnitOfWork } from '../../shared/db';
import { periodContaining, addMonths } from '../../shared/date';
import { EmployeeService, IEmployeeService, PgEmployeeRepository } from '../employee';
import {
  IPolicyService,
  LeavePolicy,
  LeavePolicyStatus,
  createPolicyService,
} from '../policy';
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
  getCurrentBalances(employeeId: string): Promise<Array<LeaveBalance & { available: number }>>;
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

  async getCurrentBalances(
    employeeId: string
  ): Promise<Array<LeaveBalance & { available: number }>> {
    const employee = await this.employeeService.getEmployeeById(employeeId);
    const policies = await this.policyService.getAllPolicies();

    const asOf = new Date();

    // Select at most one effective policy per leaveTypeCode: ACTIVE status, within
    // its effective window, tie-broken by the latest effectiveFrom.
    const effectiveByType = new Map<LeaveTypeCode, LeavePolicy>();
    for (const policy of policies) {
      if (policy.status !== LeavePolicyStatus.ACTIVE) {
        continue;
      }
      if (policy.effectiveFrom.getTime() > asOf.getTime()) {
        continue;
      }
      if (policy.effectiveTo !== null && policy.effectiveTo.getTime() < asOf.getTime()) {
        continue;
      }
      const current = effectiveByType.get(policy.leaveTypeCode);
      if (!current || policy.effectiveFrom.getTime() > current.effectiveFrom.getTime()) {
        effectiveByType.set(policy.leaveTypeCode, policy);
      }
    }

    const results: Array<LeaveBalance & { available: number }> = [];

    for (const policy of effectiveByType.values()) {
      const period = periodContaining(employee.hireDate, policy.accrualPeriodMonths, asOf);
      const balance = await this.repository.findByKey(
        employeeId,
        policy.leaveTypeCode,
        period.start,
        period.end
      );
      if (!balance) {
        continue;
      }
      results.push({
        ...balance,
        available: balance.entitledDays - balance.usedDays - balance.pendingDays,
      });
    }

    return results;
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
  return new BalanceService(
    new PgLeaveBalanceRepository(),
    new EmployeeService(new PgEmployeeRepository()),
    createPolicyService(),
    new PgUnitOfWork(),
  );
}
