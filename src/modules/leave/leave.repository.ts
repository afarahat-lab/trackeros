import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQuery } from './leave.model';

export interface ILeaveRepository {
  findAll(query: LeaveRequestQuery): Promise<LeaveRequest[]>;
  findById(id: string): Promise<LeaveRequest | null>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null>;
  delete(id: string): Promise<boolean>;
}
