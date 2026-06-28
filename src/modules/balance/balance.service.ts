import { LeaveBalance } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository';
import { IBalanceService } from './balance.service.interface';
import { LeaveType } from '../../shared/types/leave.types';

export class BalanceService implements IBalanceService {
  constructor(private readonly balanceRepository: ILeaveBalanceRepository) {}

  async getBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance | null> {
    try {
      return await this.balanceRepository.findByEmployeeAndType(employeeId, leaveType, fiscalYear);
    } catch (error) {
      throw new Error(`Failed to fetch balance for employee: ${employeeId}`);
    }
  }

  async getBalancesForEmployee(employeeId: string): Promise<LeaveBalance[]> {
    try {
      return await this.balanceRepository.findByEmployee(employeeId);
    } catch (error) {
      throw new Error(`Failed to fetch balances for employee: ${employeeId}`);
    }
  }

  async initializeBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, entitlementDays: number): Promise<LeaveBalance> {
    try {
      return await this.balanceRepository.create({
        employeeId,
        leaveType,
        balance: entitlementDays,
        fiscalYear,
      });
    } catch (error) {
      throw new Error(`Failed to initialize balance for employee: ${employeeId}`);
    }
  }

  async deductBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance> {
    try {
      const balance = await this.balanceRepository.findByEmployeeAndType(employeeId, leaveType, fiscalYear);
      if (!balance) {
        throw new Error('Balance record not found');
      }
      if (balance.balance < days) {
        throw new Error('Insufficient leave balance');
      }
      return await this.balanceRepository.decrementBalance(balance.id, days);
    } catch (error) {
      throw new Error(`Failed to deduct balance: ${(error as Error).message}`);
    }
  }

  async restoreBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance> {
    try {
      const balance = await this.balanceRepository.findByEmployeeAndType(employeeId, leaveType, fiscalYear);
      if (!balance) {
        throw new Error('Balance record not found');
      }
      return await this.balanceRepository.updateBalance(balance.id, balance.balance + days);
    } catch (error) {
      throw new Error(`Failed to restore balance: ${(error as Error).message}`);
    }
  }
}
