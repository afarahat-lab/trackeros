import { PoolClient } from 'pg';
import { LeaveRequestStatus } from '../../shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Thrown when a request is asked to move through a lifecycle transition that
 * is not permitted. The lifecycle is:
 *   PENDING -> APPROVED | REJECTED
 *   PENDING | APPROVED -> CANCELLED
 */
export class InvalidLeaveRequestTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLeaveRequestTransitionError';
  }
}

/**
 * Thrown at approval time when the requested day count exceeds the employee's
 * derived availableDays (entitlementDays - usedDays - pendingDays), which may
 * be negative.
 */
export class InsufficientLeaveBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientLeaveBalanceError';
  }
}

/**
 * Thrown at approval time when the request date range overlaps an existing
 * APPROVED leave for the same employee, regardless of leave type.
 */
export class OverlappingLeaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverlappingLeaveError';
  }
}

export interface ILeaveRequestRepository {
  create(request: LeaveRequest, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  findByEmployee(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]>;
  update(
    id: string,
    changes: Partial<LeaveRequest>,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  list(client?: PoolClient): Promise<LeaveRequest[]>;
}

export type CreateLeaveRequestInput = Omit<
  LeaveRequest,
  'id' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'updatedAt'
>;

export interface ILeaveService {
  apply(input: CreateLeaveRequestInput): Promise<LeaveRequest>;
  approve(
    id: string,
    approvedBy: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  reject(
    id: string,
    approvedBy: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  cancel(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  list(client?: PoolClient): Promise<LeaveRequest[]>;
}
