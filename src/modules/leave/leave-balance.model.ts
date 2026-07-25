export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  policyId: string;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  accruedDays: number;
  carriedForwardDays: number;
  expiresAt: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveTypeId: string;
  policyId: string;
  entitlementDays: number;
  usedDays?: number;
  pendingDays?: number;
  accruedDays?: number;
  carriedForwardDays?: number;
  expiresAt?: Date | null;
  year: number;
}
