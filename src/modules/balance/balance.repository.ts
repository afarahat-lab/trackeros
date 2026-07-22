import {
  LeaveBalance,
  BalanceAdjustment,
  CreateLeaveBalanceDto,
  CreateBalanceAdjustmentDto,
  BalanceAdjustmentStatus,
} from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeePolicyFiscalYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null>;

  findById(id: string): Promise<LeaveBalance | null>;

  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;

  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>;

  findAllByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
}

export interface IBalanceAdjustmentRepository {
  findByLeaveBalanceId(leaveBalanceId: string): Promise<BalanceAdjustment[]>;

  create(dto: CreateBalanceAdjustmentDto): Promise<BalanceAdjustment>;

  updateStatus(
    id: string,
    status: BalanceAdjustmentStatus,
    appliedAt: Date | null,
  ): Promise<BalanceAdjustment>;
}
