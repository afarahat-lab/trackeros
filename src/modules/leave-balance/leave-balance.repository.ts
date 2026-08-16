import { LeaveBalance } from './leave-balance.model';

/**
 * Repository interface for LeaveBalance entity.
 * All database access goes through this interface (GP-001).
 * The real DB-backed implementation comes in a later phase.
 */
export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
}

/**
 * Stub implementation of ILeaveBalanceRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findById(_id: string): Promise<LeaveBalance | null> {
    throw new Error('not implemented');
  }

  async findByEmployeeAndPolicy(_employeeId: string, _leavePolicyId: string, _fiscalYear: number): Promise<LeaveBalance | null> {
    throw new Error('not implemented');
  }

  async findByEmployeeId(_employeeId: string, _fiscalYear: number): Promise<LeaveBalance[]> {
    throw new Error('not implemented');
  }

  async create(_balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    throw new Error('not implemented');
  }

  async update(_id: string, _data: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    throw new Error('not implemented');
  }
}
