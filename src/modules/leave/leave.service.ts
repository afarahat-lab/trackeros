import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ILeaveRepository } from './leave.repository';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQuery, LeaveType, LeaveStatus } from './leave.model';
import { ILeavePolicyService } from '../policy/policy.service';
import { ILeaveBalanceService } from '../balance/balance.service';
import { IEmployeeService } from '../employee/employee.service';
import { IAuditService } from '../../shared/audit/audit.service';
import { INotificationService } from '../../shared/notification/notification.service';

class CreateLeaveRequestDtoClass {
  @IsString()
  employeeId!: string;

  @IsIn(['annual', 'sick', 'personal', 'maternity', 'paternity'])
  leaveType!: LeaveType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}

class UpdateLeaveRequestDtoClass {
  @IsOptional()
  @IsIn(['annual', 'sick', 'personal', 'maternity', 'paternity'])
  leaveType?: LeaveType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: LeaveStatus;
}

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

  async createLeaveRequest(dto: CreateLeaveRequestDto, employeeId: string): Promise<LeaveRequest> {
    const instance = plainToInstance(CreateLeaveRequestDtoClass, dto);
    const errors = await validate(instance);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

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
    const instance = plainToInstance(UpdateLeaveRequestDtoClass, dto);
    const errors = await validate(instance);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

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
