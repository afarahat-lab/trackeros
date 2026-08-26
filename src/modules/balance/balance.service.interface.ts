import type { PoolClient } from 'pg';
import { LeaveBalance } from './balance.model';

export interface IBalanceService {
  getAvailableDays(employeeId: string, policyId: string, year: number): Promise<number>;
  hasSufficientBalance(employeeId: string, policyId: string, year: number, requestedDays: number): Promise<boolean>;
  reserveDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void>;
  commitDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void>;
  releaseDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void>;
  restoreDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void>;
  getOrCreateBalance(employeeId: string, policyId: string, year: number, entitlementDays: number): Promise<LeaveBalance>;
}
