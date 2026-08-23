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

export interface IBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;

  findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number
  ): Promise<LeaveBalance[]>;

  findByEmployeeYearAndPolicy(
    employeeId: string,
    fiscalYear: number,
    policyId: string
  ): Promise<LeaveBalance | null>;

  create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>
  ): Promise<LeaveBalance>;

  update(
    id: string,
    data: Partial<LeaveBalance>
  ): Promise<LeaveBalance | null>;

  deductPendingDays(id: string, days: number): Promise<LeaveBalance | null>;

  commitDeduction(id: string, days: number): Promise<LeaveBalance | null>;

  restorePendingDays(id: string, days: number): Promise<LeaveBalance | null>;
}
