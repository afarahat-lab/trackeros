import { LeaveBalance } from './leave-balance.model';

export interface CreateLeaveBalanceDto {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays?: number;
  pendingDays?: number;
  remainingDays?: number;
  fiscalYear: number;
  status?: 'ACTIVE' | 'CLOSED';
}

export interface UpdateLeaveBalanceDto {
  totalEntitlement?: number;
  usedDays?: number;
  pendingDays?: number;
  remainingDays?: number;
  status?: 'ACTIVE' | 'CLOSED';
}

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  findByEmployeeIdAndPolicyId(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance | null>;
  createBatch(dtos: CreateLeaveBalanceDto[]): Promise<LeaveBalance[]>;
}
