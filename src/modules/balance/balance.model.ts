import { PoolClient } from 'pg';

export type LeaveBalanceStatus = 'ACTIVE' | 'CLOSED';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: LeaveBalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Derived available days. `availableDays` is NEVER stored; it is always
 * computed from the three stored counters. It MAY go negative — when a policy
 * correction lowers totalEntitlement below usedDays the employee is over-drawn,
 * which is information that must not be hidden by clamping.
 */
export function computeAvailableDays(
  totalEntitlement: number,
  usedDays: number,
  pendingDays: number,
): number {
  return totalEntitlement - usedDays - pendingDays;
}

/**
 * Thrown when a balance transition would take one of the stored NON-NEGATIVE
 * counters (totalEntitlement, usedDays, remainingDays) below zero. This is an
 * error, not a clamp.
 */
export class NegativeBalanceCounterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NegativeBalanceCounterError';
  }
}

export interface ILeaveBalanceRepository {
  create(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance>;
  findById(id: string, client?: PoolClient): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]>;
  /**
   * Consumes `days` of leave: increments usedDays and decrements remainingDays.
   * Throws NegativeBalanceCounterError if remainingDays (a stored non-negative
   * counter) would drop below zero. availableDays is derived and never written.
   */
  deduct(id: string, days: number, client?: PoolClient): Promise<LeaveBalance>;
  /**
   * Returns `days` of leave: decrements usedDays and increments remainingDays.
   * Throws NegativeBalanceCounterError if usedDays would drop below zero.
   */
  restore(id: string, days: number, client?: PoolClient): Promise<LeaveBalance>;
}

export type CreateLeaveBalanceInput = Omit<
  LeaveBalance,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface IBalanceService {
  create(input: CreateLeaveBalanceInput): Promise<LeaveBalance>;
  findById(id: string, client?: PoolClient): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]>;
  deduct(id: string, days: number): Promise<LeaveBalance>;
  restore(id: string, days: number): Promise<LeaveBalance>;
}
