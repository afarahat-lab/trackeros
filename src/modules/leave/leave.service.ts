import { CreateLeaveRequestDto, SubmitLeaveRequestDto, ReviewLeaveRequestDto, CancelLeaveRequestDto, LeaveRequestDto } from './dto/create-leave-request.dto';

export interface LeaveService {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequestDto>;
  submitLeaveRequest(dto: SubmitLeaveRequestDto): Promise<LeaveRequestDto>;
  reviewLeaveRequest(dto: ReviewLeaveRequestDto): Promise<LeaveRequestDto>;
  cancelLeaveRequest(dto: CancelLeaveRequestDto): Promise<LeaveRequestDto>;
  getLeaveRequestById(id: string): Promise<LeaveRequestDto | null>;
  getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequestDto[]>;
  getLeaveRequestsByManager(managerId: string): Promise<LeaveRequestDto[]>;
}
