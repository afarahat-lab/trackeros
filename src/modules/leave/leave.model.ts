export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDTO {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
}

export interface UpdateLeaveRequestStatusDTO {
  id: string;
  status: LeaveRequestStatus;
}
