import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  findAll(): Promise<LeaveRequest[]>;
  findById(id: string): Promise<LeaveRequest | null>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null>;
  delete(id: string): Promise<boolean>;
}

export class PgLeaveRepository implements ILeaveRepository {
  // In-memory store for demonstration/testing
  private leaveRequests: LeaveRequest[] = [];

  async findAll(): Promise<LeaveRequest[]> {
    return this.leaveRequests;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRequests.find((req) => req.id === id) || null;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const now = new Date();
    const newRequest: LeaveRequest = {
      id: this.generateId(),
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'pending' as any,
      reason: dto.reason,
      managerId: dto.managerId,
      createdAt: now,
      updatedAt: now,
    };
    this.leaveRequests.push(newRequest);
    return newRequest;
  }

  async update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null> {
    const index = this.leaveRequests.findIndex((req) => req.id === id);
    if (index === -1) return null;
    const existing = this.leaveRequests[index];
    const updated: LeaveRequest = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };
    this.leaveRequests[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.leaveRequests.findIndex((req) => req.id === id);
    if (index === -1) return false;
    this.leaveRequests.splice(index, 1);
    return true;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
