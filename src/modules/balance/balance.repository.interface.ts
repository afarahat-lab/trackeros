import { LeaveBalance } from "../../shared/types";

export interface IBalanceRepository {
  findByEmployeeAndTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]>;
  updateBalance(employeeId: string, leaveTypeId: string, year: number, daysUsed: number): Promise<LeaveBalance>;
}
