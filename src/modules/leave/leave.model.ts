export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Canonical leave request entity. */
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
