import { LeaveBalance } from './balance.model';

export interface IBalanceService {
  getBalance(employeeId: string, policyId: string): Promise<LeaveBalance | null>;
  getAvailableDays(employeeId: string, policyId: string): Promise<number>;
  reserveDays(employeeId: string, policyId: string, days: number): Promise<void>;
  releaseReservation(employeeId: string, policyId: string, days: number): Promise<void>;
  deductDays(employeeId: string, policyId: string, days: number): Promise<void>;
  initializeBalancesForEmployee(employeeId: string): Promise<void>;
}
