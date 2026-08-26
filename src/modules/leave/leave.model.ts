import { LeaveStatus } from '../../shared/types/index';
import { BaseEntity } from '../../shared/types/index';

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
 * BINDING RULE #6: The SINGLE canonical day-count function.
 * Counts calendar days INCLUSIVE of both startDate and endDate.
 * days = endDate - startDate + 1
 * No weekend/holiday exclusion.
 * Every call site in the service MUST use this — never inline the arithmetic.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / msPerDay) + 1;
}
