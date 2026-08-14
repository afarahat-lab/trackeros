import { PoolClient } from 'pg';
import { LeaveBalance } from './leave-balance.model';
import { LeaveType } from '../../shared/types/leave.types';
import { Employee } from '../employee/employee.model';

export interface ILeaveBalanceService {
  getBalance(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;

  initializeBalancesForEmployee(
    employee: Employee,
    client?: PoolClient,
  ): Promise<LeaveBalance[]>;

  deductOnApproval(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance>;

  releaseOnRejectionOrCancellation(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance>;

  getRemainingDays(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<number>;
}
