import 'reflect-metadata';
import { ILeaveRepository } from './leave.repository';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQuery } from './leave.model';
import { ILeavePolicyService } from '../policy/policy.service';
import { ILeaveBalanceService } from '../balance/balance.service';
import { IEmployeeService } from '../employee/employee.service';
import { IAuditService } from '../../shared/audit/audit.service';
import { INotificationService } from '../../shared/notification/notification.service';

export class InsufficientBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export interface ILeaveService {
  createLeaveRequest(dto: CreateLeaveRequestDto, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequestById(id: string, employeeId: string): Promise<LeaveRequest | null>;
  updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto, employeeId: string): Promise<LeaveRequest>;
  deleteLeaveRequest(id: string, employeeId: string): Promise<boolean>;
  listLeaveRequests(query: LeaveRequestQuery): Promise<LeaveRequest[]>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly leavePolicyService: ILeavePolicyService,
    private readonly leaveBalanceService: ILeaveBalanceService,
    private readonly employeeService: IEmployeeService,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService
  ) {}

  private validateCreateDto(dto: CreateLeaveRequestDto): void {
    if (!dto.employeeId || typeof dto.employeeId !== 'string') {
      throw new Error('Validation failed: employeeId must be a non-empty string');
    }
    if (!dto.leaveType || !['annual', 'sick', 'personal', 'maternity', 'paternity'].includes(dto.leaveType)) {
      throw new Error('Validation failed: leaveType must be one of annual, sick, personal, maternity, paternity');
    }
    if (!dto.startDate || isNaN(Date.parse(dto.startDate))) {
      throw new Error('Validation failed: startDate must be a valid date string');
    }
    if (!dto.endDate || isNaN(Date.parse(dto.endDate))) {
      throw new Error('Validation failed: endDate must be a valid date string');
    }
  }

  private validateUpdateDto(dto: UpdateLeaveRequestDto): void {
    if (dto.leaveType !== undefined && !['annual', 'sick', 'personal', 'maternity', 'paternity'].includes(dto.leaveType)) {
      throw new Error('Validation failed: leaveType must be one of annual, sick, personal, maternity, paternity');
    }
    if (dto.startDate !== undefined && isNaN(Date.parse(dto.startDate))) {
      throw new Error('Validation failed: startDate must be a valid date string');
    }
    if (dto.endDate !== undefined && isNaN(Date.parse(dto.endDate))) {
      throw new Error('Validation failed: endDate must be a valid date string');
    }
  }

  async createLeaveRequest(dto: CreateLeaveRequestDto, employeeId: string): Promise<LeaveRequest> {
    this.validateCreateDto(dto);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      throw new Error('Start date must be today or later');
    }
    if (end < start) {
      throw new Error('End date must be on or after start date');
    }

    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0) {
      throw new Error('Total leave days must be greater than zero');
    }

    const hasBalance = await this.leaveBalanceService.checkBalance(employeeId, dto.leaveType, totalDays);
    if (!hasBalance) {
      throw new InsufficientBalanceError('Insufficient leave balance');
    }

    const request = await this.leaveRepository.create(dto);

    await this.auditService.log('LEAVE_REQUEST_CREATED', {
      requestId: request.id,
      employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    await this.notificationService.send(
      employeeId,
      'LEAVE_REQUEST_SUBMITTED',
      'Leave request submitted',
      `Your ${dto.leaveType} leave from ${dto.startDate} to ${dto.endDate} has been submitted.`
    );

    return request;
  }

  async getLeaveRequestById(id: string, employeeId: string): Promise<LeaveRequest | null> {
    const request = await this.leaveRepository.findById(id);
    if (!request) return null;
    if (request.employeeId !== employeeId) {
      throw new Error('Forbidden');
    }
    return request;
  }

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto, employeeId: string): Promise<LeaveRequest> {
    this.validateUpdateDto(dto);

    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new Error('Leave request not found');
    }
    if (existing.employeeId !== employeeId) {
      throw new Error('Forbidden');
    }

    const updated = await this.leaveRepository.update(id, dto);
    if (!updated) {
      throw new Error('Update failed');
    }

    await this.auditService.log('LEAVE_REQUEST_UPDATED', {
      requestId: id,
      employeeId,
      changes: dto,
    });

    await this.notificationService.send(
      employeeId,
      'LEAVE_REQUEST_UPDATED',
      'Leave request updated',
      `Your leave request ${id} has been updated.`
    );

    return updated;
  }

  async deleteLeaveRequest(id: string, employeeId: string): Promise<boolean> {
    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new Error('Leave request not found');
    }
    if (existing.employeeId !== employeeId) {
      throw new Error('Forbidden');
    }

    const deleted = await this.leaveRepository.delete(id);
    if (!deleted) {
      throw new Error('Delete failed');
    }

    await this.auditService.log('LEAVE_REQUEST_DELETED', {
      requestId: id,
      employeeId,
    });

    await this.notificationService.send(
      employeeId,
      'LEAVE_REQUEST_DELETED',
      'Leave request deleted',
      `Your leave request ${id} has been deleted.`
    );

    return true;
  }

  async listLeaveRequests(query: LeaveRequestQuery): Promise<LeaveRequest[]> {
    return this.leaveRepository.findAll(query);
  }
}
