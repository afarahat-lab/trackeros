import { LeaveBalance } from '../balance.model';

export interface CreateLeaveBalanceDto {
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  accruedDays: number;
  usedDays: number;
  carriedOver: number;
  balanceDays: number;
}

export interface UpdateLeaveBalanceDto {
  accruedDays?: number;
  usedDays?: number;
  carriedOver?: number;
  balanceDays?: number;
}

export interface LeaveBalanceResponseDto {
  id: string;
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  accruedDays: number;
  usedDays: number;
  carriedOver: number;
  balanceDays: number;
  createdAt: Date;
  updatedAt: Date;
}
