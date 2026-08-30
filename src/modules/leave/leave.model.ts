import type { PoolClient } from 'pg';

import { LeaveRequestStatus, UserRole } from '../../shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
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

export interface ILeaveRequestRepository {
  create(request: LeaveRequest, client?: PoolClient): Promise<LeaveRequest>;
  update(request: LeaveRequest, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  findByEmployee(
    employeeId: string,
    client?: PoolClient
  ): Promise<LeaveRequest[]>;
  /**
   * Returns every APPROVED request for the given employee whose
   * [startDate, endDate] range intersects the supplied range, regardless of
   * leave type. Used for overlap detection at approval time.
   */
  findApprovedOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    client?: PoolClient
  ): Promise<LeaveRequest[]>;
}

export interface ILeaveService {
  submit(
    employeeId: string,
    leaveTypeId: string,
    startDate: Date,
    endDate: Date,
    reason: string | undefined,
    actorId: string,
    client?: PoolClient
  ): Promise<LeaveRequest>;
  approve(
    requestId: string,
    actorId: string,
    client?: PoolClient
  ): Promise<LeaveRequest>;
  reject(
    requestId: string,
    actorId: string,
    rejectionReason: string,
    client?: PoolClient
  ): Promise<LeaveRequest>;
  cancel(
    requestId: string,
    actorId: string,
    role: UserRole,
    client?: PoolClient
  ): Promise<LeaveRequest>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The single shared day-count implementation. Returns the number of calendar
 * days from startDate through endDate inclusive of both ends, with no
 * weekend or holiday exclusion. Uses UTC calendar days so time-of-day and
 * daylight-saving transitions never change the result.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const end = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  return Math.floor((end - start) / MS_PER_DAY) + 1;
}
