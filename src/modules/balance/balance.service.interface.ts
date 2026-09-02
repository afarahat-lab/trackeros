import type { PoolClient } from 'pg';

import type {
  LeaveBalance,
  CreateLeaveBalanceInput,
  UpdateLeaveBalanceInput,
} from './balance.model';

export interface ILeaveBalanceService {
  create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance>;
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndFiscalYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number
  ): Promise<LeaveBalance | null>;
  update(
    id: string,
    changes: UpdateLeaveBalanceInput,
    client?: PoolClient
  ): Promise<LeaveBalance>;
  commitDays(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance>;
}
