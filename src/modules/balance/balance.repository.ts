import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string): Promise<LeaveBalance | null>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  update(id: string, dto: Partial<CreateLeaveBalanceDto>): Promise<LeaveBalance | null>;
  delete(id: string): Promise<boolean>;
}
