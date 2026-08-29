import type { PoolClient } from 'pg';

export type BalanceStatus = 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  /**
   * Derived availability (totalEntitlement - usedDays - pendingDays); never
   * independently persisted.
   */
  remainingDays: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveBalanceRepository {
  create(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance>;
  update(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance>;
  findById(id: string, client?: PoolClient): Promise<LeaveBalance | null>;
  findByEmployeePolicyAndYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance | null>;
  findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance[]>;
}

export interface IBalanceService {
  getAvailableDays(balance: LeaveBalance): number;
  reserve(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance>;
  approve(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance>;
  reject(
    balanceId: string,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance>;
  cancel(
    balanceId: string,
    days: number,
    requestStatus: 'PENDING' | 'APPROVED',
    client?: PoolClient
  ): Promise<LeaveBalance>;
}
