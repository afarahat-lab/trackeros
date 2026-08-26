import { LeaveStatus } from 'shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

export interface LeaveRequestQueryParams {
  employeeId?: string;
  status?: LeaveStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Count calendar days inclusive of both ends.
 * SINGLE canonical day-count function — every call site MUST use this.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}
