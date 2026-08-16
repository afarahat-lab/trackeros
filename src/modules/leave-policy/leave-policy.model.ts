import { LeaveType } from '../../shared/types';

/**
 * Defines the rules and entitlements for a specific leave type.
 * Governs how many days an employee is entitled to, whether manager
 * approval is required, minimum notice periods, and accrual behaviour.
 *
 * Invariants (enforced at the service layer in later phases):
 * - No two active policies may share the same leaveType.
 * - entitlementDays must be a positive integer.
 * - accrualRate, maxAccumulation, and minimumNoticeDays are nullable;
 *   when non-null they must be non-negative numbers.
 * - A LeavePolicy is either ACTIVE (isActive: true) or INACTIVE (isActive: false).
 *   Only active policies are returned by findAllActive() and are eligible
 *   for use in leave requests.
 */
export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number | null;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
