import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { ILeaveManagementService } from './leave-management.service.interface';
import { ILeaveRequestRepository } from '../leave/leave.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { IAuditLogRepository } from '../audit/audit.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { INotificationRepository } from '../notification/notification.repository';
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

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class LeaveManagementService implements ILeaveManagementService {
  constructor(
    private leaveRepo: ILeaveRequestRepository,
    private policyRepo: ILeavePolicyRepository,
    private balanceRepo: ILeaveBalanceRepository,
    private auditRepo: IAuditLogRepository,
    private employeeRepo: IEmployeeRepository,
    private notificationRepo: INotificationRepository,
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

      const requestedDays = this.calculateDays(dto.startDate, dto.endDate);
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
    this.validateUuid(leaveId, 'leaveId');
    this.validateUuid(approverId, 'approverId');

    const leaveRequest = await this.leaveRepo.findById(leaveId);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    const approver = await this.employeeRepo.findById(approverId);
    if (!approver) {
      throw new NotFoundError('Approver not found');
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee || employee.managerId !== approver.id) {
      throw new ForbiddenError('Approver is not the manager of the requesting employee');
    }
    if (approver.role !== 'manager') {
      throw new ForbiddenError('Approver does not have manager role');
    }

    // Note: The domain model uses 'submitted' for pending requests
    if (leaveRequest.status !== 'submitted') {
      throw new BadRequestError('Leave request is not in pending status');
    }

    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query('BEGIN');

      const updatedRequest = await this.leaveRepo.updateStatus(leaveId, 'approved', approverId, comment);

      const year = new Date(leaveRequest.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
        leaveRequest.employeeId,
        leaveRequest.leaveTypeId,
        year
      );
      if (!balance) {
        throw new NotFoundError('Leave balance not found');
      }

      const days = this.calculateDays(leaveRequest.startDate, leaveRequest.endDate);
      await this.balanceRepo.update(balance.id, {
        usedDays: balance.usedDays + days,
        pendingDays: balance.pendingDays - days
      });

      await this.auditRepo.create({
        entityType: 'leave_request',
        entityId: leaveId,
        action: 'LEAVE_APPROVED',
        changedBy: approverId,
        newValues: updatedRequest
      } as any);

      await this.notificationRepo.create({
        recipientId: leaveRequest.employeeId,
        leaveRequestId: leaveId,
        type: 'LEAVE_APPROVED',
        message: 'Your leave request has been approved.'
      } as any);

      await client.query('COMMIT');
      return updatedRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectLeave(leaveId: string, approverId: string, comment?: string): Promise<LeaveRequest> {
    this.validateUuid(leaveId, 'leaveId');
    this.validateUuid(approverId, 'approverId');

    const leaveRequest = await this.leaveRepo.findById(leaveId);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    const approver = await this.employeeRepo.findById(approverId);
    if (!approver) {
      throw new NotFoundError('Approver not found');
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee || employee.managerId !== approver.id) {
      throw new ForbiddenError('Approver is not the manager of the requesting employee');
    }
    if (approver.role !== 'manager') {
      throw new ForbiddenError('Approver does not have manager role');
    }

    if (leaveRequest.status !== 'submitted') {
      throw new BadRequestError('Leave request is not in pending status');
    }

    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query('BEGIN');

      const updatedRequest = await this.leaveRepo.updateStatus(leaveId, 'rejected', approverId, comment);

      const year = new Date(leaveRequest.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
        leaveRequest.employeeId,
        leaveRequest.leaveTypeId,
        year
      );
      if (!balance) {
        throw new NotFoundError('Leave balance not found');
      }

      const days = this.calculateDays(leaveRequest.startDate, leaveRequest.endDate);
      await this.balanceRepo.update(balance.id, {
        pendingDays: balance.pendingDays - days
      });

      await this.auditRepo.create({
        entityType: 'leave_request',
        entityId: leaveId,
        action: 'LEAVE_REJECTED',
        changedBy: approverId,
        newValues: updatedRequest
      } as any);

      await this.notificationRepo.create({
        recipientId: leaveRequest.employeeId,
        leaveRequestId: leaveId,
        type: 'LEAVE_REJECTED',
        message: comment ? `Your leave request has been rejected. Comment: ${comment}` : 'Your leave request has been rejected.'
      } as any);

      await client.query('COMMIT');
      return updatedRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelLeave(leaveId: string, employeeId: string): Promise<LeaveRequest> {
    this.validateUuid(leaveId, 'leaveId');
    this.validateUuid(employeeId, 'employeeId');

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const request = await this.leaveRepo.findById(leaveId);
      if (!request) {
        throw new NotFoundError('Leave request not found');
      }
      if (request.employeeId !== employeeId) {
        throw new ForbiddenError('You can only cancel your own leave requests');
      }
      if (request.status !== 'submitted' && request.status !== 'approved') {
        throw new ConflictError('Only submitted or approved requests can be cancelled');
      }

      const oldStatus = request.status;
      const days = this.calculateDays(request.startDate, request.endDate);
      const year = request.startDate.getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(
        request.employeeId,
        request.leaveTypeId,
        year
      );
      if (!balance) {
        throw new NotFoundError('Leave balance not found');
      }

      const balanceUpdates: any = {};
      if (oldStatus === 'submitted') {
        balanceUpdates.pendingDays = balance.pendingDays - days;
      } else if (oldStatus === 'approved') {
        balanceUpdates.usedDays = balance.usedDays - days;
      }
      await this.balanceRepo.update(balance.id, balanceUpdates);

      const updatedRequest = await this.leaveRepo.updateStatus(leaveId, 'cancelled');

      await this.auditRepo.create({
        entityType: 'leave_request',
        entityId: request.id,
        action: 'cancelled',
        changedBy: employeeId,
        oldValues: { status: oldStatus },
        newValues: { status: 'cancelled' },
      } as any);

      await this.notificationRepo.create({
        recipientId: request.approverId || request.employeeId,
        leaveRequestId: request.id,
        type: 'leave_cancelled',
        message: `Leave request ${request.id} has been cancelled by employee.`,
      } as any);

      await client.query('COMMIT');
      return updatedRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async discardDraft(leaveId: string, employeeId: string): Promise<void> {
    this.validateUuid(leaveId, 'leaveId');
    this.validateUuid(employeeId, 'employeeId');

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const request = await this.leaveRepo.findById(leaveId);
      if (!request) {
        throw new NotFoundError('Leave request not found');
      }
      if (request.employeeId !== employeeId) {
        throw new ForbiddenError('You can only discard your own drafts');
      }
      if (request.status !== 'draft') {
        throw new ConflictError('Only draft requests can be discarded');
      }

      await this.leaveRepo.updateStatus(leaveId, 'cancelled');

      await this.auditRepo.create({
        entityType: 'leave_request',
        entityId: request.id,
        action: 'discarded',
        changedBy: employeeId,
        oldValues: { status: 'draft' },
        newValues: { status: 'cancelled' },
      } as any);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance> {
    throw new NotImplementedError('getLeaveBalance not implemented');
  }

  async getLeaveHistory(employeeId: string): Promise<LeaveRequest[]> {
    throw new NotImplementedError('getLeaveHistory not implemented');
  }

  private validateUuid(value: string, fieldName: string): void {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestError(`Invalid ${fieldName} UUID format`);
    }
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  }
}
