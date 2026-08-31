import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import {
  CreateLeaveBalanceInput,
  IBalanceService,
  LeaveBalance,
} from './balance.model';
import { PgLeaveBalanceRepository } from './balance.repository';

export class BalanceService implements IBalanceService {
  constructor(
    private readonly balances: PgLeaveBalanceRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(input: CreateLeaveBalanceInput): Promise<LeaveBalance> {
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
    return this.balances.create(balance);
  }

  async findById(
    id: string,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    return this.balances.findById(id, client);
  }

  async findByEmployee(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    return this.balances.findByEmployee(employeeId, client);
  }

  async deduct(id: string, days: number): Promise<LeaveBalance> {
    return this.uow.withTransaction((client) =>
      this.balances.deduct(id, days, client),
    );
  }

  async restore(id: string, days: number): Promise<LeaveBalance> {
    return this.uow.withTransaction((client) =>
      this.balances.restore(id, days, client),
    );
  }
}
