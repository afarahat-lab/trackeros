import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types';

export interface ILeaveRepository {
  findAll(): Promise<LeaveRequest[]>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null>;
  delete(id: string): Promise<boolean>;
}

export class PgLeaveRepository implements ILeaveRepository {
  private store: Map<string, LeaveRequest> = new Map();

  async findAll(): Promise<LeaveRequest[]> {
    return Array.from(this.store.values());
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmployeeId(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const all = Array.from(this.store.values()).filter(r => r.employeeId === employeeId);
    if (status) {
      return all.filter(r => r.requestStatus === status);
    }
    return all;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const id = this.generateId();
    const now = new Date();
    const leaveRequest: LeaveRequest = {
      id,
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'pending' as any,
      requestStatus: LeaveRequestStatus.Draft,
      reason: dto.reason,
      managerId: dto.managerId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, leaveRequest);
    return leaveRequest;
  }

  async update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }
    const updated: LeaveRequest = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
