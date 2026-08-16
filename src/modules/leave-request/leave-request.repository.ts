import { LeaveStatus, LeaveRequestQueryParams } from '../../shared/types';
import { LeaveRequest } from './leave-request.model';

/**
 * Repository interface for LeaveRequest entity.
 * All database access goes through this interface (GP-001).
 * The real DB-backed implementation comes in a later phase.
 */
export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
}

/**
 * Stub implementation of ILeaveRequestRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class LeaveRequestRepository implements ILeaveRequestRepository {
  async findById(_id: string): Promise<LeaveRequest | null> {
    throw new Error('not implemented');
  }

  async findByEmployeeId(_employeeId: string): Promise<LeaveRequest[]> {
    throw new Error('not implemented');
  }

  async findByStatus(_status: LeaveStatus): Promise<LeaveRequest[]> {
    throw new Error('not implemented');
  }

  async query(_params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    throw new Error('not implemented');
  }

  async create(_request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    throw new Error('not implemented');
  }

  async update(_id: string, _data: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    throw new Error('not implemented');
  }
}
