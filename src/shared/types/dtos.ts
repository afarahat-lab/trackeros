import { LeaveStatus } from './enums';

export interface LeaveRequestDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  rejectionReason?: string;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN';
  createdAt: string;
  updatedAt: string;
}
