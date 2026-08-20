import { BalanceStatus } from '../../shared/types';

export interface Balance {
  id: string;
  employeeId: string;
  leaveType: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class InsufficientBalanceError extends Error {
  public readonly code = 'INSUFFICIENT_BALANCE';

  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class BalanceNotFoundError extends Error {
  public readonly code = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'BalanceNotFoundError';
  }
}

export interface IBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<Balance[]>;
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string): Promise<Balance | null>;
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<Balance[]>;
  create(balance: Omit<Balance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Balance>;
  update(id: string, data: Partial<Balance>): Promise<Balance | null>;
  deductDays(id: string, days: number): Promise<Balance | null>;
}

export interface IBalanceService {
  getBalance(employeeId: string, leaveType: string): Promise<Balance | null>;
  getBalances(employeeId: string): Promise<Balance[]>;
  hasSufficientBalance(employeeId: string, leaveType: string, requestedDays: number): Promise<boolean>;
  deductBalance(employeeId: string, leaveType: string, days: number): Promise<Balance>;
}
