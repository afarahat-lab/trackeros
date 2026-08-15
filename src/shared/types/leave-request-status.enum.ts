export const LeaveRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type LeaveRequestStatus = (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus];

export const LEAVE_REQUEST_STATUS_VALUES: readonly LeaveRequestStatus[] = Object.values(
  LeaveRequestStatus,
) as readonly LeaveRequestStatus[];
