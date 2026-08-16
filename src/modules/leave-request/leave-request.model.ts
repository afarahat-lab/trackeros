import { LeaveStatus } from '../../shared/types';

/**
 * Represents a leave request submitted by an employee.
 *
 * Invariants (enforced at the service layer in later phases):
 * - Lifecycle: DRAFT → SUBMITTED → (APPROVED | REJECTED); may be CANCELLED from SUBMITTED or APPROVED.
 * - approvedBy and approvedAt must both be null when status is not APPROVED; both must be non-null when status is APPROVED.
 * - cancelledAt must be null unless status is CANCELLED.
 * - startDate must be on or before endDate (full-day granularity).
 * - employeeId references a valid Employee.id.
 * - leavePolicyId references a valid LeavePolicy.id.
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
