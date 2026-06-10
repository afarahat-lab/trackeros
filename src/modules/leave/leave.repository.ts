import type { LeaveRequest } from './leave.model';

/** Leave repository contract. */
export interface LeaveRepository {
  create(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
}

/** In-memory repository implementation for repository-layer behavior. */
export class InMemoryLeaveRepository implements LeaveRepository {
  private readonly store = new Map<string, LeaveRequest>();

  public async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    this.store.set(leaveRequest.id, leaveRequest);
    return leaveRequest;
  }

  public async findById(id: string): Promise<LeaveRequest | null> {
    return this.store.get(id) ?? null;
  }

  public async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    return Array.from(this.store.values()).filter(
      (request) => request.employeeId === employeeId,
    );
  }
}
