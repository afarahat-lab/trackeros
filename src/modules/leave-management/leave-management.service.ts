import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { ILeaveManagementService } from './leave-management.service.interface';
import { ILeaveRequestRepository } from '../leave/leave.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { IAuditLogRepository } from '../audit/audit.repository';
import { CreateLeaveRequestDto, LeaveRequest } from '../leave/leave.model';
import { LeaveBalance } from '../balance/balance.model';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class LeaveManagementService implements ILeaveManagementService {
  constructor(
    private leaveRepo: ILeaveRequestRepository,
    private policyRepo: ILeavePolicyRepository,
    private balanceRepo: ILeaveBalanceRepository,
    private auditRepo: IAuditLogRepository,
    private dbPool: Pool = pool
  ) {}

  async applyForLeave(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.startDate || !dto.endDate) {
      throw new ValidationError('Missing required fields: employeeId, leaveTypeId, startDate, endDate');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new ValidationError('endDate must be greater than or equal to startDate');
    }

    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query('BEGIN');

      const policy = await this.policyRepo.findByLeaveTypeId(dto.leaveTypeId);
      if (!policy) {
        throw new NotFoundError('Leave policy not found');
      }

      const year = start.getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
        dto.employeeId, 
        dto.leaveTypeId, 
        year
      );
      if (!balance) {
        throw new NotFoundError('Leave balance not found');
      }

      const requestedDays = this.calculateDays(dto.startDate.toString(), dto.endDate.toString());
      const availableDays = balance.totalEntitlement - balance.usedDays - balance.pendingDays;

      if (availableDays < requestedDays) {
        throw new InsufficientBalanceError('Insufficient leave balance');
      }

      const draftRequest = await this.leaveRepo.create(
        { ...dto, status: 'draft' } as any
      );
      
      const submittedRequest = await this.leaveRepo.updateStatus(
        draftRequest.id, 
        'submitted'
      );

      await this.auditRepo.create({
        entityType: 'leave_request',
        entityId: submittedRequest.id,
        action: 'SUBMITTED',
        changedBy: dto.employeeId,
        newValues: submittedRequest
      } as any);

      await client.query('COMMIT');
      return submittedRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveLeave(leaveId: string, approverId: string, comment?: string): Promise<LeaveRequest> {
    throw new NotImplementedError('approveLeave not implemented');
  }

  async rejectLeave(leaveId: string, approverId: string, comment: string): Promise<LeaveRequest> {
    throw new NotImplementedError('rejectLeave not implemented');
  }

  async cancelLeave(leaveId: string, employeeId: string): Promise<LeaveRequest> {
    throw new NotImplementedError('cancelLeave not implemented');
  }

  async discardDraft(leaveId: string, employeeId: string): Promise<void> {
    throw new NotImplementedError('discardDraft not implemented');
  }

  async getLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance> {
    throw new NotImplementedError('getLeaveBalance not implemented');
  }

  async getLeaveHistory(employeeId: string): Promise<LeaveRequest[]> {
    throw new NotImplementedError('getLeaveHistory not implemented');
  }

  private calculateDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
