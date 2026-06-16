import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(request: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], managerId?: string, rejectionReason?: string): Promise<LeaveRequest>;
}

export class LeaveRepository implements ILeaveRepository {
  constructor(private readonly db: any) {}

  async create(request: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }

  async updateStatus(id: string, status: LeaveRequest['status'], managerId?: string, rejectionReason?: string): Promise<LeaveRequest> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }
}
