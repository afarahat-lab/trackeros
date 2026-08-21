import { z } from 'zod';
import { LeaveType, LeaveStatus } from '../../shared/types';

// ---- Entity ----

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// ---- DTO ----

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

// ---- Error classes ----

export class LeaveRequestNotFoundError extends Error {
  public readonly code = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'LeaveRequestNotFoundError';
  }
}

export class LeaveRequestValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'LeaveRequestValidationError';
  }
}

// ---- Validation schemas (Zod) ----

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.enum([
    LeaveType.annual,
    LeaveType.sick,
    LeaveType.emergency,
  ]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be on or before endDate' },
);

export const updateLeaveRequestSchema = z.object({
  leaveType: z.enum([
    LeaveType.annual,
    LeaveType.sick,
    LeaveType.emergency,
  ]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  reason: z.string().optional(),
  status: z.enum([
    LeaveStatus.draft,
    LeaveStatus.submitted,
    LeaveStatus.approved,
    LeaveStatus.rejected,
    LeaveStatus.cancelled,
  ]).optional(),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate !== undefined && data.endDate !== undefined) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'startDate must be on or before endDate' },
);

// ---- Repository interface ----

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  /**
   * Update the status of a leave request.
   *
   * Allowed transitions:
   *   DRAFT → SUBMITTED
   *   SUBMITTED → APPROVED | REJECTED
   *   SUBMITTED | APPROVED → CANCELLED
   *
   * Once REJECTED or CANCELLED, no further transitions are permitted.
   *
   * @returns The updated LeaveRequest, or null if no request with the given id exists.
   */
  updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string,
    rejectionReason?: string,
  ): Promise<LeaveRequest | null>;
}

// ---- Service interface ----

export interface ILeaveRequestService {
  /**
   * Submit a new leave request. Validates the DTO via createLeaveRequestSchema.
   * Throws LeaveRequestValidationError for invalid input.
   * Throws domain errors for business rule violations (insufficient balance,
   * overlapping request, inactive employee).
   */
  submit(request: CreateLeaveRequestDto): Promise<LeaveRequest>;

  /**
   * Approve a leave request. The request must be in 'submitted' status.
   * Throws LeaveRequestNotFoundError if the request does not exist.
   * Throws a domain error if the request is not in 'submitted' status.
   * The approverId is recorded as approvedBy.
   */
  approve(id: string, approverId: string): Promise<LeaveRequest>;

  /**
   * Reject a leave request. The request must be in 'submitted' status.
   * Throws LeaveRequestNotFoundError if the request does not exist.
   * Throws a domain error if the request is not in 'submitted' status.
   * Throws LeaveRequestValidationError if reason is empty.
   */
  reject(id: string, approverId: string, reason: string): Promise<LeaveRequest>;

  /**
   * Cancel a leave request. The request must be in 'submitted' or 'approved' status.
   * Throws LeaveRequestNotFoundError if the request does not exist.
   * Throws a domain error if the request is not in 'submitted' or 'approved' status.
   * The employeeId must match the request's employeeId (self-cancellation only);
   * mismatch throws a domain error.
   */
  cancel(id: string, employeeId: string): Promise<LeaveRequest>;

  getById(id: string): Promise<LeaveRequest | null>;
  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getPendingForManager(managerId: string): Promise<LeaveRequest[]>;
}
