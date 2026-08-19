import { LeaveBalance } from './balance.model';

export interface CreateBalanceDto {
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  fiscalYear: number;
}

export interface IBalanceService {
  getById(id: string): Promise<LeaveBalance | null>;
  getByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  getByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>;
  create(data: CreateBalanceDto): Promise<LeaveBalance>;
  deductDays(id: string, days: number): Promise<LeaveBalance>;
  restoreDays(id: string, days: number): Promise<LeaveBalance>;
  hasSufficientBalance(employeeId: string, leavePolicyId: string, requestedDays: number): Promise<boolean>;
}
