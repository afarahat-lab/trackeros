import {
  LeaveRequest,
  LeaveRequestStatus,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams
} from '../../shared/types/index';

export {
  LeaveRequest,
  LeaveRequestStatus,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams
};

export const LEAVE_REQUEST_TRANSITIONS: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  [LeaveRequestStatus.DRAFT]: [LeaveRequestStatus.SUBMITTED, LeaveRequestStatus.CANCELLED],
  [LeaveRequestStatus.SUBMITTED]: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED, LeaveRequestStatus.CANCELLED],
  [LeaveRequestStatus.APPROVED]: [LeaveRequestStatus.CANCELLED],
  [LeaveRequestStatus.REJECTED]: [],
  [LeaveRequestStatus.CANCELLED]: []
};

export function isValidTransition(from: LeaveRequestStatus, to: LeaveRequestStatus): boolean {
  return LEAVE_REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}
