export type BalanceStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class InsufficientBalanceError extends Error {
  public readonly balanceId: string;
  public readonly requestedDays: number;
  public readonly availableDays: number;

  constructor(balanceId: string, requestedDays: number, availableDays: number) {
    super(
      `Insufficient balance: requested ${requestedDays} day(s) but only ${availableDays} day(s) available`,
    );
    this.name = 'InsufficientBalanceError';
    this.balanceId = balanceId;
    this.requestedDays = requestedDays;
    this.availableDays = availableDays;
  }
}

export interface IBalanceRepository {
  findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null>;

  findByEmployeeId(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>;

  create(data: Omit<LeaveBalance, 'id' | 'remainingDays' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;

  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null>;

  incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;

  decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
}
