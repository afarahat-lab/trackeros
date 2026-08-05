import { Employee } from '../employee';
import { LeavePolicy } from '../leave-policy';

export type LeaveBalanceStatus = 'ACTIVE' | 'CLOSED' | 'FORECAST';

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

/** Reference types for foreign-key relationships — not used at runtime, only for type documentation. */
export type LeaveBalanceEmployeeRef = Pick<Employee, 'id'>;
export type LeaveBalancePolicyRef = Pick<LeavePolicy, 'id'>;
