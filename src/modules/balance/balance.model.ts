export enum LeaveBalanceStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum BalanceAdjustmentStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  REVERSED = 'REVERSED',
}

export type AdjustmentType = 'DEBIT' | 'CREDIT';

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

export interface BalanceAdjustment {
  id: string;
  leaveBalanceId: string;
  leaveRequestId: string | null;
  adjustmentType: AdjustmentType;
  amountDays: number;
  reason: string;
  performedBy: string | null;
  status: BalanceAdjustmentStatus;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  fiscalYear: number;
}

export interface CreateBalanceAdjustmentDto {
  leaveBalanceId: string;
  leaveRequestId?: string;
  adjustmentType: AdjustmentType;
  amountDays: number;
  reason: string;
  performedBy?: string;
}
