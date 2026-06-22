import { ILeaveRequestRepository } from './leave.repository';
import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestStatus } from './leave.model';
import { EmployeeService } from '../employee/employee.service';
import { PolicyService } from '../policy/policy.service';
import { BalanceService } from '../balance/balance.service';
import { INotificationRepository } from '../notification/notification.repository';
import { IAuditRepository } from '../audit/audit.repository';
import { AuditAction, EntityType } from '../audit/audit.model';
import { AppError } from '../../shared/types';

export interface LeaveRequestFilters {
  status?: LeaveRequestStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface ILeaveService {
  createDraftLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
  approveLeaveRequest(id: string, managerId: string): Promise<LeaveRequest>;
  rejectLeaveRequest(id: string, managerId: string, reason?: string): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequest(id: string): Promise<LeaveRequest>;
  getEmployeeLeaveRequests(employeeId: string, filters?: LeaveRequestFilters): Promise<LeaveRequest[]>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepo: ILeaveRequestRepository,
    private readonly employeeService: EmployeeService,
    private readonly policyService: PolicyService,
    private readonly balanceService: BalanceService,
    private readonly notificationRepo: INotificationRepository,
    private readonly auditRepo: IAuditRepository
  ) {}

  async createDraftLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    await this.employeeService.getEmployeeById(dto.employeeId);
    await this.policyService.getPolicyByLeaveTypeId(dto.leaveTypeId);
    
    const leaveRequest = await this.leaveRepo.create(dto);
    
    await this.auditRepo.create({
      entityType: EntityType.LEAVE_REQUEST,
      entityId: leaveRequest.id,
      action: AuditAction.CREATE,
      newValue: leaveRequest as unknown as Record<string, unknown>,
    });
    
    return leaveRequest;
  }

  async submitLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.findById(id);
    if (!leaveRequest) throw new AppError('Leave request not found', 404);
    if (leaveRequest.employeeId !== employeeId) throw new AppError('Unauthorized', 403);
    if (leaveRequest.status !== LeaveRequestStatus.DRAFT) {
      throw new AppError('Invalid status transition', 400);
    }

    const policy = await this.policyService.getPolicyByLeaveTypeId(leaveRequest.leaveTypeId);
    
    if (leaveRequest.daysRequested > policy.maxConsecutiveDays) {
      throw new AppError('Exceeds maximum consecutive days allowed', 400);
    }
    
    if (leaveRequest.daysRequested > policy.maxDaysPerYear) {
      throw new AppError('Exceeds maximum days allowed per year', 400);
    }

    if (this.isBlackout(leaveRequest.startDate, leaveRequest.endDate, policy.blackoutDates)) {
      throw new AppError('Requested dates include blackout dates', 400);
    }

    // Note: True atomicity requires transaction support at the repository level.
    // Executing sequentially as current repository interfaces do not expose transaction clients.
    const updatedRequest = await this.leaveRepo.updateStatus(id, LeaveRequestStatus.SUBMITTED);
    
    await this.auditRepo.create({
      entityType: EntityType.LEAVE_REQUEST,
      entityId: id,
      action: AuditAction.UPDATE,
      oldValue: leaveRequest as unknown as Record<string, unknown>,
      newValue: updatedRequest as unknown as Record<string, unknown>,
    });

    await this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      message: `Your leave request has been submitted.`,
      type: 'in_app' as any,
    });

    return updatedRequest;
  }

  async approveLeaveRequest(id: string, managerId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.findById(id);
    if (!leaveRequest) throw new AppError('Leave request not found', 404);
    
    const isManager = await this.employeeService.isManagerOf(managerId, leaveRequest.employeeId);
    if (!isManager) throw new AppError('Unauthorized: Not the manager of the employee', 403);
    
    if (![LeaveRequestStatus.SUBMITTED, LeaveRequestStatus.UNDER_REVIEW].includes(leaveRequest.status)) {
      throw new AppError('Invalid status transition', 400);
    }

    const year = new Date(leaveRequest.startDate).getFullYear();
    const balance = await this.balanceService.getBalance(leaveRequest.employeeId, leaveRequest.leaveTypeId, year);
    if (!balance) throw new AppError('Leave balance not found for the employee', 404);

    const newUsedDays = balance.usedDays + leaveRequest.daysRequested;
    
    // Note: True atomicity requires transaction support at the repository level.
    const updatedRequest = await this.leaveRepo.updateStatus(id, LeaveRequestStatus.APPROVED, managerId);
    await this.balanceService.updateBalance(balance.id, newUsedDays);
    
    await this.auditRepo.create({
      entityType: EntityType.LEAVE_REQUEST,
      entityId: id,
      action: AuditAction.UPDATE,
      oldValue: leaveRequest as unknown as Record<string, unknown>,
      newValue: updatedRequest as unknown as Record<string, unknown>,
    });

    await this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      message: `Your leave request has been approved.`,
      type: 'in_app' as any,
    });

    return updatedRequest;
  }

  async rejectLeaveRequest(id: string, managerId: string, reason?: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.findById(id);
    if (!leaveRequest) throw new AppError('Leave request not found', 404);
    
    const isManager = await this.employeeService.isManagerOf(managerId, leaveRequest.employeeId);
    if (!isManager) throw new AppError('Unauthorized: Not the manager of the employee', 403);
    
    if (![LeaveRequestStatus.SUBMITTED, LeaveRequestStatus.UNDER_REVIEW].includes(leaveRequest.status)) {
      throw new AppError('Invalid status transition', 400);
    }

    const updatedRequest = await this.leaveRepo.updateStatus(id, LeaveRequestStatus.REJECTED, managerId);
    
    await this.auditRepo.create({
      entityType: EntityType.LEAVE_REQUEST,
      entityId: id,
      action: AuditAction.UPDATE,
      oldValue: leaveRequest as unknown as Record<string, unknown>,
      newValue: updatedRequest as unknown as Record<string, unknown>,
    });

    await this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      message: `Your leave request has been rejected. Reason: ${reason || 'Not provided'}`,
      type: 'in_app' as any,
    });

    return updatedRequest;
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.findById(id);
    if (!leaveRequest) throw new AppError('Leave request not found', 404);
    if (leaveRequest.employeeId !== employeeId) throw new AppError('Unauthorized', 403);
    
    if ([LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED, LeaveRequestStatus.CANCELLED].includes(leaveRequest.status)) {
      throw new AppError('Invalid status transition', 400);
    }

    const updatedRequest = await this.leaveRepo.updateStatus(id, LeaveRequestStatus.CANCELLED);
    
    await this.auditRepo.create({
      entityType: EntityType.LEAVE_REQUEST,
      entityId: id,
      action: AuditAction.UPDATE,
      oldValue: leaveRequest as unknown as Record<string, unknown>,
      newValue: updatedRequest as unknown as Record<string, unknown>,
    });

    await this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      message: `Your leave request has been cancelled.`,
      type: 'in_app' as any,
    });

    return updatedRequest;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.findById(id);
    if (!leaveRequest) throw new AppError('Leave request not found', 404);
    return leaveRequest;
  }

  async getEmployeeLeaveRequests(employeeId: string, filters?: LeaveRequestFilters): Promise<LeaveRequest[]> {
    await this.employeeService.getEmployeeById(employeeId);
    const requests = await this.leaveRepo.findByEmployeeId(employeeId);
    
    if (!filters) return requests;
    
    return requests.filter(req => {
      if (filters.status && req.status !== filters.status) return false;
      if (filters.startDate && new Date(req.startDate) < filters.startDate) return false;
      if (filters.endDate && new Date(req.endDate) > filters.endDate) return false;
      return true;
    });
  }

  private isBlackout(start: Date, end: Date, blackouts: Date[]): boolean {
    if (!blackouts || blackouts.length === 0) return false;
    const current = new Date(start);
    const endDt = new Date(end);
    while (current <= endDt) {
      if (blackouts.some(b => new Date(b).toDateString() === current.toDateString())) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  }
}
