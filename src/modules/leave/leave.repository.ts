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
 * Implementation is deferred to a later phase.
 */
export class PgLeaveRequestRepository implements LeaveRequestRepository {
  public async create(_request: LeaveRequest): Promise<void> {
    throw new Error("PgLeaveRequestRepository.create is not implemented in this phase");
  }

  public async findById(_id: string): Promise<LeaveRequest | null> {
    throw new Error("PgLeaveRequestRepository.findById is not implemented in this phase");
  }

  public async updateStatus(_id: string, _status: LeaveRequestStatus): Promise<void> {
    throw new Error("PgLeaveRequestRepository.updateStatus is not implemented in this phase");
  }
}