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

/** Type-only references — not re-exported, used for FK documentation */
export type LeaveBalanceEmployee = Employee;
export type LeaveBalancePolicy = LeavePolicy;
