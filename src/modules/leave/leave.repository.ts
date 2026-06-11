import { LeaveRequest, LeaveRequestStatus } from "./leave.model";

/**
 * Repository contract for leave request persistence.
 */
export interface LeaveRequestRepository {
  create(request: LeaveRequest): Promise<void>;
  findById(id: string): Promise<LeaveRequest | null>;
  updateStatus(id: string, status: LeaveRequestStatus): Promise<void>;
}

/**
 * PostgreSQL-backed leave request repository contract.
 * Persistence implementation is deferred to a later phase.
 */
export class PgLeaveRequestRepository implements LeaveRequestRepository {
  public async create(_request: LeaveRequest): Promise<void> {
    return Promise.resolve();
  }

  public async findById(_id: string): Promise<LeaveRequest | null> {
    return Promise.resolve(null);
  }

  public async updateStatus(_id: string, _status: LeaveRequestStatus): Promise<void> {
    return Promise.resolve();
  }
}