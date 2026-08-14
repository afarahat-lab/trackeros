import { LeaveBalance } from './leave-balance.model';

export interface ILeaveBalanceService {
  getBalancesForEmployee(
    employeeId: string,
    fiscalYear?: number,
  ): Promise<LeaveBalance[]>;

  initializeBalancesForEmployee(
    employeeId: string,
    hireDate: Date,
  ): Promise<LeaveBalance[]>;

  getAvailableBalance(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<number>;

  reserveDays(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void>;

  finalizeDeduction(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void>;

  releaseReservation(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void>;
}
