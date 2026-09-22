import { EmployeeRole, LeaveStatus } from '../../shared/types/index';

export const SUBMIT_ACTION = 'submit';
export const CANCEL_ACTION = 'cancel';
export const APPROVE_ACTION = 'approve';
export const REJECT_ACTION = 'reject';

/**
 * Pure status + role action matrix. Returns the list of actions a user may
 * take for a leave request in a given status, or an empty array when the
 * combination permits no action.
 *
 * - The owner may submit and cancel a DRAFT, and cancel a SUBMITTED request.
 * - A MANAGER or ADMIN may approve or reject a SUBMITTED request.
 */
/**
 * Whether a role may decide (approve or reject) someone else's leave request.
 *
 * The ONE home for this rule. It is exported rather than inlined because two callers need
 * it — `getAvailableLeaveActions` below, which decides whether to offer the buttons, and the
 * `RequireApprover` route guard, which decides whether to render the approvals route at all.
 *
 * The guard previously carried its own copy written the other way round, as
 * `role === EMPLOYEE -> deny`. Across today's three roles that is equivalent; add a fourth
 * and the two diverge in the dangerous direction — this rule denies it, the inverted copy
 * ADMITS it, and an unrecognised role reaches other employees' leave data. A rule expressed
 * twice is a rule that will eventually be expressed inconsistently, and the failure here is
 * fail-open.
 */
export function canApproveLeave(role: EmployeeRole): boolean {
  return role === EmployeeRole.MANAGER || role === EmployeeRole.ADMIN;
}

export function getAvailableLeaveActions(
  status: LeaveStatus,
  role: EmployeeRole,
  isOwner: boolean,
): string[] {
  if (isOwner) {
    if (status === LeaveStatus.DRAFT) {
      return [SUBMIT_ACTION, CANCEL_ACTION];
    }
    if (status === LeaveStatus.SUBMITTED) {
      return [CANCEL_ACTION];
    }
    return [];
  }

  if (canApproveLeave(role)) {
    if (status === LeaveStatus.SUBMITTED) {
      return [APPROVE_ACTION, REJECT_ACTION];
    }
  }

  return [];
}
