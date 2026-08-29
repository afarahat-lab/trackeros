import type { PoolClient } from 'pg';

import { InsufficientBalanceError, NotFoundError } from '../../shared/types/errors';
import {
  IBalanceService,
  ILeaveBalanceRepository,
  LeaveBalance
} from './balance.model';
import { PgLeaveBalanceRepository } from './balance.repository';

export class BalanceService implements IBalanceService {
  private readonly repository: ILeaveBalanceRepository;

  constructor(
    repository: ILeaveBalanceRepository = new PgLeaveBalanceRepository()
  ) {
    this.repository = repository;
  }

  getAvailableDays(balance: LeaveBalance): number {
    return balance.totalEntitlement - balance.usedDays - balance.pendingDays;
  }

  async reserve(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findById(balanceId, client);
    if (!balance) {
      throw new NotFoundError(`Leave balance ${balanceId} not found`);
    }
    const available = this.getAvailableDays(balance);
    if (days < 0) {
      throw new InsufficientBalanceError(
        'Cannot reserve a negative number of days'
      );
    }
    if (days > available) {
      throw new InsufficientBalanceError(
        `Cannot reserve ${days} days; only ${available} available`
      );
    }
    return this.persist(
      { ...balance, pendingDays: balance.pendingDays + days },
      client
    );
  }

  async approve(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findById(balanceId, client);
    if (!balance) {
      throw new NotFoundError(`Leave balance ${balanceId} not found`);
    }
    if (days < 0) {
      throw new InsufficientBalanceError(
        'Cannot approve a negative number of days'
      );
    }
    if (balance.pendingDays < days) {
      throw new InsufficientBalanceError(
        `Cannot approve ${days} days; only ${balance.pendingDays} pending`
      );
    }
    return this.persist(
      {
        ...balance,
        pendingDays: balance.pendingDays - days,
        usedDays: balance.usedDays + days
      },
      client
    );
  }

  async reject(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findById(balanceId, client);
    if (!balance) {
      throw new NotFoundError(`Leave balance ${balanceId} not found`);
    }
    if (days < 0) {
      throw new InsufficientBalanceError(
        'Cannot reject a negative number of days'
      );
    }
    if (balance.pendingDays < days) {
      throw new InsufficientBalanceError(
        `Cannot reject ${days} days; only ${balance.pendingDays} pending`
      );
    }
    return this.persist(
      { ...balance, pendingDays: balance.pendingDays - days },
      client
    );
  }

  async cancel(
    balanceId: string,
    days: number,
    requestStatus: 'PENDING' | 'APPROVED',
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findById(balanceId, client);
    if (!balance) {
      throw new NotFoundError(`Leave balance ${balanceId} not found`);
    }
    if (days < 0) {
      throw new InsufficientBalanceError(
        'Cannot cancel a negative number of days'
      );
    }
    if (requestStatus === 'PENDING') {
      if (balance.pendingDays < days) {
        throw new InsufficientBalanceError(
          `Cannot cancel ${days} pending days; only ${balance.pendingDays} pending`
        );
      }
      return this.persist(
        { ...balance, pendingDays: balance.pendingDays - days },
        client
      );
    }
    if (balance.usedDays < days) {
      throw new InsufficientBalanceError(
        `Cannot cancel ${days} used days; only ${balance.usedDays} used`
      );
    }
    return this.persist(
      { ...balance, usedDays: balance.usedDays - days },
      client
    );
  }

  private async persist(
    balance: LeaveBalance,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const remainingDays = this.getAvailableDays(balance);
    const status =
      balance.status === 'CLOSED'
        ? 'CLOSED'
        : remainingDays <= 0
          ? 'EXHAUSTED'
          : 'ACTIVE';
    return this.repository.update(
      { ...balance, remainingDays, status, updatedAt: new Date() },
      client
    );
  }
}
