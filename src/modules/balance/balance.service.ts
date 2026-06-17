import { LeaveBalance, LeaveBalanceQuery } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';

export interface ILeaveBalanceService {
  getBalanceByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>;
  getBalanceById(id: string): Promise<LeaveBalance | null>;
  updateBalance(id: string, balanceDays: number): Promise<LeaveBalance>;
  deductFromBalance(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
  addToBalance(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
}

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: ILeaveBalanceRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly leavePolicyRepository: ILeavePolicyRepository
  ) {}

  async getBalanceByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]> {
    throw new Error('Not implemented');
  }

  async getBalanceById(id: string): Promise<LeaveBalance | null> {
    throw new Error('Not implemented');
  }

  async updateBalance(id: string, balanceDays: number): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }

  async deductFromBalance(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }

  async addToBalance(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }
}
