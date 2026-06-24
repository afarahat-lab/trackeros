import { IEmployeeService } from '../employee/employee.service';
import { IPolicyService } from '../policy/policy.service';
import { ILeaveBalanceService } from '../balance/balance.service';
import { INotificationService } from '../notification/notification.service';
import { IAuditService } from '../audit/audit.service';
import { ILeaveRequestRepository } from './leave.repository';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  LeaveRequestStatus,
  AuditAction,
  EmploymentStatus,
  CreateNotificationDto
} from '../../shared/types/index';

export interface ListLeaveRequestsDto {
  employeeId?: string;
  status?: LeaveRequestStatus;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface ILeaveService {
  submitLeaveRequest(dto: CreateLeaveRequestDto, employeeId: string): Promise<LeaveRequest>;
  approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest>;
  rejectLeaveRequest(id: string, approverId: string): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequest(id: string): Promise<LeaveRequest | null>;
  listLeaveRequests(dto: ListLeaveRequestsDto): Promise<{ data: LeaveRequest[]; total: number }>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRequestRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
    private readonly balanceService: ILeaveBalanceService,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService
  ) {}

  private calculateDays(startDate: Date, endDate: Date): number {
    return Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  async submitLeaveRequest(dto: CreateLeaveRequestDto, employeeId: string): Promise<LeaveRequest> {
    const employee = await this.employeeService.getEmployee(employeeId);
    if (!employee) throw new Error('Employee not found');
    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) throw new Error('Employee is not active');

    const days = this.calculateDays(dto.startDate, dto.endDate);
    const balance = await this.balanceService.getBalance(employeeId, dto.leaveTypeId, new Date().getFullYear());
    const isValid = await this.policyService.validateEntitlement(dto.leaveTypeId, days, balance?.remainingDays || 0);
    if (!isValid) throw new Error('Insufficient leave balance or invalid policy');

    const leaveRequest = await this.leaveRepository.create({
      employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason || null,
      status: LeaveRequestStatus.SUBMITTED,
      approvedBy: null,
      approvedAt: null
    });

    await this.auditService.recordAction('LeaveRequest', leaveRequest.id, AuditAction.SUBMIT, employeeId, { newValues: leaveRequest });

    const notificationDto: CreateNotificationDto = {
      recipientId: employee.managerId || employeeId,
      type: 'LEAVE_REQUEST',
      title: 'Leave Request Submitted',
      message: `A new leave request has been submitted.`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: leaveRequest.id
    };
    await this.notificationService.createNotification(notificationDto);

    return leaveRequest;
  }

  async approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) throw new Error('Leave request not found');
    if (request.status !== LeaveRequestStatus.SUBMITTED) throw new Error('Request is not pending approval');

    const days = this.calculateDays(request.startDate, request.endDate);
    await this.balanceService.deductBalance(request.employeeId, request.leaveTypeId, days);

    const updatedRequest = await this.leaveRepository.update(id, {
      status: LeaveRequestStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date()
    });

    await this.auditService.recordAction('LeaveRequest', id, AuditAction.APPROVE, approverId, {
      oldValues: request,
      newValues: updatedRequest
    });

    return updatedRequest;
  }

  async rejectLeaveRequest(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) throw new Error('Leave request not found');
    if (request.status !== LeaveRequestStatus.SUBMITTED) throw new Error('Request is not pending approval');

    const updatedRequest = await this.leaveRepository.update(id, {
      status: LeaveRequestStatus.REJECTED,
      approvedBy: approverId,
      approvedAt: new Date()
    });

    await this.auditService.recordAction('LeaveRequest', id, AuditAction.REJECT, approverId, {
      oldValues: request,
      newValues: updatedRequest
    });

    return updatedRequest;
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) throw new Error('Leave request not found');
    if (request.status !== LeaveRequestStatus.SUBMITTED && request.status !== LeaveRequestStatus.APPROVED) {
      throw new Error('Request cannot be cancelled');
    }

    if (request.status === LeaveRequestStatus.APPROVED) {
      const days = this.calculateDays(request.startDate, request.endDate);
      await this.balanceService.restoreBalance(request.employeeId, request.leaveTypeId, days);
    }

    const updatedRequest = await this.leaveRepository.update(id, {
      status: LeaveRequestStatus.CANCELLED
    });

    await this.auditService.recordAction('LeaveRequest', id, AuditAction.CANCEL, employeeId, {
      oldValues: request,
      newValues: updatedRequest
    });

    return updatedRequest;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | null> {
    return await this.leaveRepository.findById(id);
  }

  async listLeaveRequests(dto: ListLeaveRequestsDto): Promise<{ data: LeaveRequest[]; total: number }> {
    // Assuming the repository implements a findMany or similar method for pagination and filtering
    return await (this.leaveRepository as any).findMany(dto);
  }
}
