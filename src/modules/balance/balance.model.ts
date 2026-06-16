export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  balanceDays: number;
  fiscalYear: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  policyId: string;
  balanceDays: number;
  fiscalYear: number;
}

export interface UpdateLeaveBalanceDto {
  balanceDays: number;
}

export interface ILeaveBalanceRepository {
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance>;
  delete(id: string): Promise<boolean>;
}
