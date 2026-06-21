import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { ILeaveManagementService, UserContext, LeaveRequestFilters } from './leave-management.service.interface';
import { ILeaveRequestRepository } from '../leave/leave.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { IAuditLogRepository } from '../audit/audit.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { INotificationRepository } from '../notification/notification.repository';
import { IAuditService } from '../../shared/audit/audit.service.interface';
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
    private auditService: IAuditService,
    private dbPool: Pool = pool
  ) {}

  async createLeaveRequest(dto: CreateLeaveRequestDto, user: UserContext): Promise<LeaveRequest> {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.startDate || !dto.endDate) {
      throw new ValidationError('Missing required fields: employeeId, leaveTypeId, startDate, endDate');
    }
    const draft = await this.leaveRepo.create({ ...dto, status: 'draft' } as any);
    return draft;
  }

  async submitLeaveRequest(id: string, user: UserContext): Promise<LeaveRequest> {
    this.validateUuid(id, 'id');
    const request = await this.leaveRepo.findById(id);
    if (!request) throw new NotFoundError('Leave request not found');
    if (request.employeeId !== user.id) throw new ForbiddenError('Can only submit own requests');
    if (request.status !== 'draft') throw new BadRequestError('Request is not a draft');

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      
      const year = new Date(request.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(request.employeeId, request.leaveTypeId, year);
      if (!balance) throw new NotFoundError('Leave balance not found');
      
      const days = this.calculateDays(request.startDate, request.endDate);
      const available = balance.totalEntitlement - balance.usedDays - balance.pendingDays;
      if (available < days) throw new InsufficientBalanceError('Insufficient leave balance');

      const submitted = await this.leaveRepo.updateStatus(id, 'submitted');
      await this.balanceRepo.update(balance.id, { pendingDays: balance.pendingDays + days });
      
      await this.auditService.log('LeaveRequest', id, 'SUBMITTED', user.id, { status: 'draft' }, { status: 'submitted' });
      
      await client.query('COMMIT');
      return submitted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async approveLeaveRequest(id: string, user: UserContext, comment?: string): Promise<LeaveRequest> {
    this.validateUuid(id, 'id');
    if (user.role !== 'manager') throw new ForbiddenError('Only managers can approve requests');
    
    const request = await this.leaveRepo.findById(id);
    if (!request) throw new NotFoundError('Leave request not found');
    
    const emp = await this.employeeRepo.findById(request.employeeId);
    if (!emp || emp.managerId !== user.id) throw new ForbiddenError('Not authorized to approve this request');
    if (request.status !== 'submitted') throw new BadRequestError('Request is not pending');

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      
      const updated = await this.leaveRepo.updateStatus(id, 'approved', user.id, comment);
      
      const year = new Date(request.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(request.employeeId, request.leaveTypeId, year);
      if (!balance) throw new NotFoundError('Leave balance not found');
      
      const days = this.calculateDays(request.startDate, request.endDate);
      await this.balanceRepo.update(balance.id, {
        usedDays: balance.usedDays + days,
        pendingDays: balance.pendingDays - days
      });

      await this.auditService.log('LeaveRequest', id, 'APPROVED', user.id, { status: 'submitted' }, { status: 'approved' });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectLeaveRequest(id: string, user: UserContext, comment: string): Promise<LeaveRequest> {
    this.validateUuid(id, 'id');
    if (user.role !== 'manager') throw new ForbiddenError('Only managers can reject requests');
    
    const request = await this.leaveRepo.findById(id);
    if (!request) throw new NotFoundError('Leave request not found');
    
    const emp = await this.employeeRepo.findById(request.employeeId);
    if (!emp || emp.managerId !== user.id) throw new ForbiddenError('Not authorized to reject this request');
    if (request.status !== 'submitted') throw new BadRequestError('Request is not pending');

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      
      const updated = await this.leaveRepo.updateStatus(id, 'rejected', user.id, comment);
      
      const year = new Date(request.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(request.employeeId, request.leaveTypeId, year);
      if (!balance) throw new NotFoundError('Leave balance not found');
      
      const days = this.calculateDays(request.startDate, request.endDate);
      await this.balanceRepo.update(balance.id, { pendingDays: balance.pendingDays - days });

      await this.auditService.log('LeaveRequest', id, 'REJECTED', user.id, { status: 'submitted' }, { status: 'rejected' });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelLeaveRequest(id: string, user: UserContext): Promise<LeaveRequest> {
    this.validateUuid(id, 'id');
    const request = await this.leaveRepo.findById(id);
    if (!request) throw new NotFoundError('Leave request not found');
    
    let isAuthorized = false;
    if (request.employeeId === user.id) {
      isAuthorized = true;
    } else if (user.role === 'manager') {
      const emp = await this.employeeRepo.findById(request.employeeId);
      if (emp && emp.managerId === user.id) isAuthorized = true;
    }
    if (!isAuthorized) throw new ForbiddenError('Not authorized to cancel this request');
    if (request.status !== 'submitted' && request.status !== 'approved') {
      throw new BadRequestError('Only submitted or approved requests can be cancelled');
    }

    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      
      const year = new Date(request.startDate).getFullYear();
      const balance = await this.balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear(request.employeeId, request.leaveTypeId, year);
      if (!balance) throw new NotFoundError('Leave balance not found');
      
      const days = this.calculateDays(request.startDate, request.endDate);
      const balanceUpdates: any = {};
      if (request.status === 'submitted') {
        balanceUpdates.pendingDays = balance.pendingDays - days;
      } else if (request.status === 'approved') {
        balanceUpdates.usedDays = balance.usedDays - days;
      }
      await this.balanceRepo.update(balance.id, balanceUpdates);

      const updated = await this.leaveRepo.updateStatus(id, 'cancelled');
      
      await this.auditService.log('LeaveRequest', id, 'CANCELLED', user.id, { status: request.status }, { status: 'cancelled' });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async discardDraftLeaveRequest(id: string, user: UserContext): Promise<void> {
    this.validateUuid(id, 'id');
    const request = await this.leaveRepo.findById(id);
    if (!request) throw new NotFoundError('Leave request not found');
    if (request.employeeId !== user.id) throw new ForbiddenError('Can only discard own drafts');
    if (request.status !== 'draft') throw new BadRequestError('Only draft requests can be discarded');

    await this.leaveRepo.updateStatus(id, 'cancelled');
    await this.auditService.log('LeaveRequest', id, 'DISCARDED', user.id, { status: 'draft' }, { status: 'cancelled' });
  }

  async getLeaveBalance(employeeId: string, user: UserContext): Promise<LeaveBalance[]> {
    this.validateUuid(employeeId, 'employeeId');
    if (user.role === 'employee') {
      if (employeeId !== user.id) throw new ForbiddenError('Cannot view other balances');
    } else if (user.role === 'manager') {
      const emp = await this.employeeRepo.findById(employeeId);
      if (!emp || emp.managerId !== user.id) throw new ForbiddenError('Cannot view balance for this employee');
    } else {
      throw new ForbiddenError('Unauthorized');
    }
    
    const year = new Date().getFullYear();
    return await this.balanceRepo.findByEmployeeIdAndYear(employeeId, year);
  }

  async getLeaveHistory(filters: LeaveRequestFilters, user: UserContext): Promise<LeaveRequest[]> {
    if (user.role === 'employee') {
      filters.employeeId = user.id;
    } else if (user.role === 'manager') {
      if (filters.employeeId) {
        const emp = await this.employeeRepo.findById(filters.employeeId);
        if (!emp || emp.managerId !== user.id) throw new ForbiddenError('Cannot view history for this employee');
        return await this.leaveRepo.findByEmployeeId(filters.employeeId);
      } else {
        const team = await this.employeeRepo.findByManagerId(user.id);
        const history: LeaveRequest[] = [];
        for (const emp of team) {
          const empHistory = await this.leaveRepo.findByEmployeeId(emp.id);
          history.push(...empHistory);
        }
        return history;
      }
    } else {
      throw new ForbiddenError('Unauthorized');
    }

    if (filters.employeeId) {
      return await this.leaveRepo.findByEmployeeId(filters.employeeId);
    }
    return [];
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
