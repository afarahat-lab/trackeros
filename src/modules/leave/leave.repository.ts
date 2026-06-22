import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestStatus } from "./leave.model";

export interface ILeaveRequestRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByApproverId(approverId: string): Promise<LeaveRequest[]>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(id: string, status: LeaveRequestStatus, approverId?: string, comment?: string): Promise<LeaveRequest>;
}
