/**
 * The valid lifecycle states for a leave balance. A balance is ACTIVE while an
 * employee can still draw against it and CLOSED once the fiscal year has been
 * settled; there is no other state.
 */
export type LeaveBalanceStatus = 'ACTIVE' | 'CLOSED';

/**
 * Tracks one employee's entitlement, used and remaining leave days for a single
 * policy and fiscal year. A balance is uniquely identified by
 * (employeeId, policyId, fiscalYear). `usedDays` and `remainingDays` are always
 * non-negative integers with no rounding; `remainingDays` is always
 * `totalEntitlement - usedDays`. `id`, `createdAt` and `updatedAt` are generated
 * by the repository and never caller-supplied.
 */
export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The caller-supplied payload for creating a balance. `usedDays` defaults to 0
 * and `status` defaults to 'ACTIVE'; `remainingDays` is derived by the
 * repository as `totalEntitlement - usedDays` and is never caller-supplied.
 */
export interface CreateLeaveBalanceInput {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays?: number;
  fiscalYear: number;
  status?: LeaveBalanceStatus;
}

/**
 * The caller-supplied changes for an update. Only the supplied fields are
 * persisted; `id`, `createdAt` and `updatedAt` are never caller-supplied.
 */
export interface UpdateLeaveBalanceInput {
  totalEntitlement?: number;
  usedDays?: number;
  remainingDays?: number;
  fiscalYear?: number;
  status?: LeaveBalanceStatus;
}
