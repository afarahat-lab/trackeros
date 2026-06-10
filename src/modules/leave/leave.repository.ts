import { LeaveRequest } from "./leave.model";

/**
 * Repository contract for leave request persistence.
 */
export interface LeaveRepository {
  create(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
}
