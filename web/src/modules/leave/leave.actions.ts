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

  if (role === EmployeeRole.MANAGER || role === EmployeeRole.ADMIN) {
    if (status === LeaveStatus.SUBMITTED) {
      return [APPROVE_ACTION, REJECT_ACTION];
    }
  }

  return [];
}
