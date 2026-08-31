import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { AuditAction, EntityType } from '../../shared/types';
import { AuditService, AuditRecordInput } from '../audit';
import {
  CreateLeaveBalanceInput,
  IBalanceService,
  LeaveBalance,
  NegativeBalanceCounterError,
} from './balance.model';
import { PgLeaveBalanceRepository } from './balance.repository';

/**
 * The three stored counters are non-negative. A transition (or a create) that
 * would introduce a negative value is an error, not a clamp. `availableDays`
 * is derived and never stored, so overdraw from a policy correction is NOT
 * caught here — it is allowed and simply makes the derived value negative.
 */
function assertCountersNonNegative(input: {
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
}): void {
  if (input.totalEntitlement < 0) {
    throw new NegativeBalanceCounterError('totalEntitlement cannot be negative');
  }
  if (input.usedDays < 0) {
    throw new NegativeBalanceCounterError('usedDays cannot be negative');
  }
  if (input.remainingDays < 0) {
    throw new NegativeBalanceCounterError('remainingDays cannot be negative');
  }
}

export class BalanceService implements IBalanceService {
  constructor(
    private readonly balances: PgLeaveBalanceRepository,
    private readonly audit: AuditService,
    private readonly uow: IUnitOfWork,
  ) {}

  create(input: CreateLeaveBalanceInput): Promise<LeaveBalance> {
    assertCountersNonNegative(input);
    const run = async (client: PoolClient): Promise<LeaveBalance> => {
      const now = new Date();
      const balance: LeaveBalance = {
        id: randomUUID(),
        employeeId: input.employeeId,
        policyId: input.policyId,
        totalEntitlement: input.totalEntitlement,
        usedDays: input.usedDays,
        remainingDays: input.remainingDays,
        fiscalYear: input.fiscalYear,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      const created = await this.balances.create(balance, client);
      await this.audit.record(this.auditEntry(created.id, AuditAction.CREATE, null, created), client);
      return created;
    };
    return this.uow.withTransaction(run);
  }

  findById(id: string, client?: PoolClient): Promise<LeaveBalance | null> {
    return this.balances.findById(id, client);
  }

  findByEmployee(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]> {
    return this.balances.findByEmployee(employeeId, client);
  }

  deduct(id: string, days: number): Promise<LeaveBalance> {
    const run = async (client: PoolClient): Promise<LeaveBalance> => {
      const before = await this.balances.findById(id, client);
      const after = await this.balances.deduct(id, days, client);
      await this.audit.record(this.auditEntry(id, AuditAction.UPDATE, before, after), client);
      return after;
    };
    return this.uow.withTransaction(run);
  }

  restore(id: string, days: number): Promise<LeaveBalance> {
    const run = async (client: PoolClient): Promise<LeaveBalance> => {
      const before = await this.balances.findById(id, client);
      const after = await this.balances.restore(id, days, client);
      await this.audit.record(this.auditEntry(id, AuditAction.UPDATE, before, after), client);
      return after;
    };
    return this.uow.withTransaction(run);
  }

  private auditEntry(
    id: string,
    action: AuditAction,
    before: LeaveBalance | null,
    after: LeaveBalance,
  ): AuditRecordInput {
    return {
      entityType: EntityType.LEAVE_BALANCE,
      entityId: id,
      action,
      oldValues: before
        ? {
            totalEntitlement: before.totalEntitlement,
            usedDays: before.usedDays,
            remainingDays: before.remainingDays,
          }
        : null,
      newValues: {
        totalEntitlement: after.totalEntitlement,
        usedDays: after.usedDays,
        remainingDays: after.remainingDays,
      },
      performedBy: null,
      performedAt: new Date(),
    };
  }
}
