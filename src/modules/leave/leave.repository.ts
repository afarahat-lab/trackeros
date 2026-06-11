import type { LeaveRequest } from "./leave.model";

/** Repository contract for leave request persistence. */
export interface LeaveRequestRepository {
  create(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  update(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
}
