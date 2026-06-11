export const LeaveType = {
  ANNUAL: "ANNUAL",
  SICK: "SICK",
  EMERGENCY: "EMERGENCY",
} as const;

export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const LeaveRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type LeaveRequestStatus = (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus];

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  status: LeaveRequestStatus;
}

export interface SubmitLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
}