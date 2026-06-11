export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

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