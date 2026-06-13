import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], processorId?: string, rejectionReason?: string): Promise<LeaveRequest>;
  update(leaveRequest: Partial<LeaveRequest> & { id: string }): Promise<LeaveRequest>;
}

export class PgLeaveRequestRepository implements ILeaveRepository {
  constructor(private readonly pool: import('pg').Pool) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation using PostgreSQL pool
    throw new Error('Not implemented');
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    throw new Error('Not implemented');
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    throw new Error('Not implemented');
  }

  async updateStatus(id: string, status: LeaveRequest['status'], processorId?: string, rejectionReason?: string): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }

  async update(leaveRequest: Partial<LeaveRequest> & { id: string }): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }
}
