export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  approverEmployeeId: string | null;
  createdAt: Date;
}

export interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  status: LeaveRequestStatus;
  approver_employee_id: string | null;
  created_at: Date;
}
