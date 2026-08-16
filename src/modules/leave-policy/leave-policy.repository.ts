import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types';

/**
 * Repository interface for LeavePolicy entity.
 * All database access goes through this interface (GP-001).
 * The real DB-backed implementation comes in a later phase.
 */
export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

/**
 * Stub implementation of ILeavePolicyRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class LeavePolicyRepository implements ILeavePolicyRepository {
  async findById(_id: string): Promise<LeavePolicy | null> {
    throw new Error('not implemented');
  }

  async findByLeaveType(_leaveType: LeaveType): Promise<LeavePolicy | null> {
    throw new Error('not implemented');
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    throw new Error('not implemented');
  }

  async create(_policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    throw new Error('not implemented');
  }

  async update(_id: string, _data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    throw new Error('not implemented');
  }
}
