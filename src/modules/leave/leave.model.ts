import { LeaveStatus, LeaveTypeCode } from '../../shared/types';

/**
 * Canonical leave request entity (DOMAIN.md). `requestedDays` is the inclusive
 * calendar-day count derived once via the shared `requestedDays` helper and
 * stored on the row; it is never re-derived per module.
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  requestedDays: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approvalComment: string | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
}

/**
 * Fields supplied by the caller when creating a new (DRAFT) request. The
 * repository stamps `id`, defaults `status` to DRAFT and sets the
 * approval/decision/submission columns to null.
 */
export type CreateLeaveRequestInput = Omit<
  LeaveRequest,
  'id' | 'status' | 'approverId' | 'approvalComment' | 'submittedAt' | 'decidedAt'
>;

/** Mutable subset used to transition state on submit/approve/reject. */
export type UpdateLeaveRequestInput = Partial<
  Omit<LeaveRequest, 'id' | 'employeeId' | 'leaveTypeCode' | 'requestedDays'>
>;
