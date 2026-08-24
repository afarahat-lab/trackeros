import { BaseEntity } from 'shared/types/leave.types';

export type BalanceStatus = 'ACTIVE' | 'EXHAUSTED' | 'FROZEN' | 'CLOSED';

export type CreateBalanceData = {
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
};

export class LeaveBalance implements BaseEntity {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  fiscalYear: number;
  private _status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    employeeId: string;
    policyId: string;
    totalEntitlement: number;
    usedDays: number;
    pendingDays: number;
    fiscalYear: number;
    status: BalanceStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.employeeId = data.employeeId;
    this.policyId = data.policyId;
    this.totalEntitlement = data.totalEntitlement;
    this.usedDays = data.usedDays;
    this.pendingDays = data.pendingDays;
    this.fiscalYear = data.fiscalYear;
    this._status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get remainingDays(): number {
    return this.totalEntitlement - this.usedDays - this.pendingDays;
  }

  get status(): BalanceStatus {
    if (this._status === 'FROZEN' || this._status === 'CLOSED') {
      return this._status;
    }
    return this.remainingDays === 0 ? 'EXHAUSTED' : 'ACTIVE';
  }
}

export class BalanceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Balance not found: ${identifier}`);
    this.name = 'BalanceNotFoundError';
  }
}

export class DuplicateBalanceError extends Error {
  constructor(employeeId: string, policyId: string, fiscalYear: number) {
    super(
      `Balance already exists for employee "${employeeId}", policy "${policyId}", fiscal year ${fiscalYear}`
    );
    this.name = 'DuplicateBalanceError';
  }
}

export interface IBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number
  ): Promise<LeaveBalance[]>;
  findByEmployeeYearAndPolicy(
    employeeId: string,
    fiscalYear: number,
    policyId: string
  ): Promise<LeaveBalance | null>;
  create(data: CreateBalanceData): Promise<LeaveBalance>;
  update(
    id: string,
    data: Partial<LeaveBalance>
  ): Promise<LeaveBalance | null>;
  deductPendingDays(id: string, days: number): Promise<LeaveBalance | null>;
  commitDeduction(id: string, days: number): Promise<LeaveBalance | null>;
  restorePendingDays(id: string, days: number): Promise<LeaveBalance | null>;
}
