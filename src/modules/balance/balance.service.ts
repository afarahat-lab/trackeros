import { ILeaveBalanceRepository } from './balance.repository';
import { IAuditService } from '../audit/audit.service';
import { LeaveBalance, AuditAction } from '../../shared/types';
import { BalanceStatus } from './balance.model';

export interface ILeaveBalanceService {
  getAllBalances(): Promise<LeaveBalance[]>;
  getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  getBalancesByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  deductBalance(employeeId: string, policyId: string, days: number): Promise<LeaveBalance>;
  restoreBalance(employeeId: string, policyId: string, days: number): Promise<LeaveBalance>;
  initializeBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>;
}

export class BalanceService implements ILeaveBalanceService {
  constructor(
    private readonly balanceRepository: ILeaveBalanceRepository,
    private readonly auditService: IAuditService
  ) {}

  async getAllBalances(): Promise<LeaveBalance[]> {
    return (this.balanceRepository as any).findAll();
  }

  async getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    return this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear);
  }

  async getBalancesByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    return this.balanceRepository.findByEmployee(employeeId);
  }

  async deductBalance(employeeId: string, policyId: string, days: number): Promise<LeaveBalance> {
    const balances = await this.balanceRepository.findByEmployee(employeeId);
    const balance = balances.find(b => b.policyId === policyId);
    if (!balance) throw new Error('Balance not found');

    const oldValues = { ...balance };
    const newRemaining = balance.remainingDays - days;
    if (newRemaining < 0) throw new Error('Insufficient balance');

    const newStatus = newRemaining === 0 ? BalanceStatus.EXHAUSTED : balance.status;

    // Note: True atomicity with auditService requires the audit service interface to accept a PoolClient.
    // Executing sequentially as per current interface constraints.
    const updated = await (this.balanceRepository as any).update(balance.id, {
      usedDays: balance.usedDays + days,
      remainingDays: newRemaining,
      status: newStatus
    });

    await this.auditService.recordAction(
      'leave_balances',
      balance.id,
      AuditAction.UPDATE,
      null,
      { oldValues, newValues: updated }
    );

    return updated;
  }

  async restoreBalance(employeeId: string, policyId: string, days: number): Promise<LeaveBalance> {
    const balances = await this.balanceRepository.findByEmployee(employeeId);
    const balance = balances.find(b => b.policyId === policyId);
    if (!balance) throw new Error('Balance not found');

    const oldValues = { ...balance };
    const newUsed = Math.max(0, balance.usedDays - days);
    const actualRestored = balance.usedDays - newUsed;
    const newRemaining = balance.remainingDays + actualRestored;

    const newStatus = newRemaining > 0 && balance.status === BalanceStatus.EXHAUSTED ? BalanceStatus.ACTIVE : balance.status;

    const updated = await (this.balanceRepository as any).update(balance.id, {
      usedDays: newUsed,
      remainingDays: newRemaining,
      status: newStatus
    });

    await this.auditService.recordAction(
      'leave_balances',
      balance.id,
      AuditAction.UPDATE,
      null,
      { oldValues, newValues: updated }
    );

    return updated;
  }

  async initializeBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance> {
    const created = await (this.balanceRepository as any).create({
      employeeId,
      policyId,
      fiscalYear,
      totalEntitlement: 0,
      usedDays: 0,
      remainingDays: 0,
      status: BalanceStatus.INITIALIZED
    });

    await this.auditService.recordAction(
      'leave_balances',
      created.id,
      AuditAction.CREATE,
      null,
      { newValues: created }
    );

    return created;
  }
}
