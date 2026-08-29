import {
  LeaveRequestStatus,
  LeaveTypeCode
} from './enums';

export type FiscalYear = number;

export interface LeaveRequestDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceDTO {
  id: string;
  employeeId: string;
  policyId: string;
  leaveTypeCode: LeaveTypeCode;
  fiscalYear: FiscalYear;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
}
