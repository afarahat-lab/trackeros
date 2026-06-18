import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(data: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status']): Promise<LeaveRequest>;
  delete(id: string): Promise<void>;
}

export class PgLeaveRepository implements ILeaveRepository {
  // Implementation would use a PostgreSQL pool
  // For now, this is a placeholder to satisfy the interface
  async create(data: CreateLeaveRequestDto): Promise<LeaveRequest> {
    throw new Error('Method not implemented.');
  }
  async findById(id: string): Promise<LeaveRequest | null> {
    throw new Error('Method not implemented.');
  }
  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    throw new Error('Method not implemented.');
  }
  async updateStatus(id: string, status: LeaveRequest['status']): Promise<LeaveRequest> {
    throw new Error('Method not implemented.');
  }
  async delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
