import { PoolClient } from 'pg';
import { LeaveType, BaseEntity } from 'shared/types/leave.types';

export type BalanceStatus = 'ACTIVE' | 'EXHAUSTED' | 'FROZEN' | 'CLOSED';

export interface LeaveBalance extends BaseEntity {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
}

export class BalanceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Balance not found: ${identifier}`);
    this.name = 'BalanceNotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(leaveType: LeaveType, requested: number, remaining: number) {
    super(
      `Insufficient balance for ${leaveType}: requested ${requested}, remaining ${remaining}`
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class DuplicateBalanceError extends Error {
  constructor(employeeId: string, policyId: string, fiscalYear: number) {
    super(
      `A balance already exists for employee ${employeeId}, policy ${policyId}, fiscal year ${fiscalYear}`
    );
    this.name = 'DuplicateBalanceError';
  }
}

export interface IBalanceRepository {
  findById(id: string, client?: PoolClient): Promise<LeaveBalance | null>;

  findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance[]>;

  findByEmployeeYearAndPolicy(
    employeeId: string,
    fiscalYear: number,
    policyId: string,
    client?: PoolClient
  ): Promise<LeaveBalance | null>;

  create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>,
    client?: PoolClient
  ): Promise<LeaveBalance>;

  update(
    id: string,
    data: Partial<LeaveBalance>,
    client?: PoolClient
  ): Promise<LeaveBalance | null>;

  deductPendingDays(id: string, days: number, client?: PoolClient): Promise<LeaveBalance | null>;

  commitDeduction(id: string, days: number, client?: PoolClient): Promise<LeaveBalance | null>;

  restorePendingDays(id: string, days: number, client?: PoolClient): Promise<LeaveBalance | null>;
}
