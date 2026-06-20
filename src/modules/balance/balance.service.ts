import { IBalanceService } from "./balance.service.interface";
import { IBalanceRepository } from "./balance.repository.interface";
import { LeaveBalance, AppError } from "../../shared/types";

export class BalanceService implements IBalanceService {
  private balanceRepo: IBalanceRepository;

  constructor(balanceRepo: IBalanceRepository) {
    this.balanceRepo = balanceRepo;
  }

  async getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    try {
      return await this.balanceRepo.findByEmployeeAndTypeAndYear(employeeId, leaveTypeId, year);
    } catch (error) {
      throw new AppError(`Failed to get balance: ${(error as Error).message}`, 500);
    }
  }

  async getBalancesForEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    try {
      return await this.balanceRepo.findByEmployee(employeeId, year);
    } catch (error) {
      throw new AppError(`Failed to get balances for employee: ${(error as Error).message}`, 500);
    }
  }

  async updateBalance(employeeId: string, leaveTypeId: string, year: number, daysUsed: number): Promise<LeaveBalance> {
    try {
      return await this.balanceRepo.updateBalance(employeeId, leaveTypeId, year, daysUsed);
    } catch (error) {
      throw new AppError(`Failed to update balance: ${(error as Error).message}`, 500);
    }
  }
}
