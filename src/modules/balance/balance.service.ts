import {
  Balance,
  BalanceNotFoundError,
  IBalanceRepository,
  IBalanceService,
  InsufficientBalanceError,
} from './balance.model';

export class BalanceService implements IBalanceService {
  constructor(private readonly repository: IBalanceRepository) {}

  async getBalance(
    employeeId: string,
    leaveType: string,
  ): Promise<Balance | null> {
    return this.repository.findByEmployeeIdAndLeaveType(employeeId, leaveType);
  }

  async getBalances(employeeId: string): Promise<Balance[]> {
    return this.repository.findByEmployeeId(employeeId);
  }

  async hasSufficientBalance(
    employeeId: string,
    leaveType: string,
    requestedDays: number,
  ): Promise<boolean> {
    const balance = await this.repository.findByEmployeeIdAndLeaveType(
      employeeId,
      leaveType,
    );
    if (balance === null) {
      return false;
    }
    return balance.remainingDays >= requestedDays;
  }

  async deductBalance(
    employeeId: string,
    leaveType: string,
    days: number,
  ): Promise<Balance> {
    const balance = await this.repository.findByEmployeeIdAndLeaveType(
      employeeId,
      leaveType,
    );

    if (balance === null) {
      throw new BalanceNotFoundError(
        `Balance not found for employee ${employeeId} and leave type ${leaveType}`,
      );
    }

    if (balance.remainingDays < days) {
      throw new InsufficientBalanceError(
        `Insufficient balance: requested ${days} days but only ${balance.remainingDays} remaining`,
      );
    }

    const updated = await this.repository.deductDays(balance.id, days);
    if (updated === null) {
      throw new BalanceNotFoundError(
        `Balance not found for id ${balance.id}`,
      );
    }
    return updated;
  }
}
