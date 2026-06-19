import { LeaveBalanceDto, UpdateLeaveBalanceDto } from './dto/create-balance.dto';

export interface BalanceService {
  getBalanceById(id: string): Promise<LeaveBalanceDto | null>;
  getBalancesByEmployee(employeeId: string): Promise<LeaveBalanceDto[]>;
  updateBalance(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalanceDto | null>;
}
