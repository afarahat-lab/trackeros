import { ILeaveRepository } from './leave.repository';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export class LeaveRepository implements ILeaveRepository {
  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }
  async findById(id: string): Promise<LeaveRequest | null> {
    throw new Error('Not implemented');
  }
  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }
  async delete(id: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
