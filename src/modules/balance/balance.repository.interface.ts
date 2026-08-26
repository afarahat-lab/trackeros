import type { PoolClient } from 'pg';
import { LeaveBalance } from './balance.model';

export interface IBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeePolicyAndYear(employeeId: string, policyId: string, year: number): Promise<LeaveBalance | null>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  updateCounters(id: string, usedDays: number, pendingDays: number, client?: PoolClient): Promise<LeaveBalance>;
  getOrCreateForYear(employeeId: string, policyId: string, year: number, entitlementDays: number): Promise<LeaveBalance>;
}
