import { PoolClient } from 'pg';
import { LeaveRequestStatus, UserRole } from '../../shared/types';

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

/**
 * Thrown when the actor attempting to approve/reject/cancel is not the
 * employee's manager (Employee.managerId) and is not an HR_ADMIN.
 */
export class LeaveAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeaveAuthorizationError';
  }
}

/**
 * Thrown when `apply` is attempted for an employee whose employmentStatus is
 * not ACTIVE.
 */
export class InactiveEmployeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InactiveEmployeeError';
  }
}

/**
 * Thrown when a leave request references a leave type for which there is no
 * active LeavePolicy (leave_type + is_active).
 */
export class InactiveLeavePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InactiveLeavePolicyError';
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
  apply(
    input: CreateLeaveRequestInput,
    actorId: string,
    actorRole: UserRole,
  ): Promise<LeaveRequest>;
  approve(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  reject(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  cancel(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;
  list(client?: PoolClient): Promise<LeaveRequest[]>;
}
