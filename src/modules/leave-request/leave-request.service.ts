
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from './leave-request.model';
import { ILeaveRequestRepository } from './leave-request.repository';
import { IEmployeeService } from 'modules/employee';
import { ILeavePolicyService } from 'modules/leave-policy';
import { ILeaveBalanceService } from 'modules/balance';
import { LeaveStatus, LeaveType } from 'shared/types';
import { NotFoundError, ValidationError, ConflictError } from 'shared/error-types';

export interface ILeaveRequestService {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submit(id: string): Promise<LeaveRequest>;
  approve(id: string, approverId: string): Promise<LeaveRequest>;
  reject(id: string, approverId: string): Promise<LeaveRequest>;
  cancel(id: string, cancelledBy: string): Promise<LeaveRequest>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  getById(id: string): Promise<LeaveRequest>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>;
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly leaveRequestRepository: ILeaveRequestRepository,
    private readonly employeeService: IEmployeeService,
    private readonly leavePolicyService: ILeavePolicyService,
    private readonly leaveBalanceService: ILeaveBalanceService,
  ) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (dto.endDate < dto.startDate) {
      throw new ValidationError('endDate must be on or after startDate');
    }

    const employee = await this.employeeService.getById(dto.employeeId);
    if (employee.employmentStatus !== 'ACTIVE') {
      throw new ValidationError('Employee is not active');
    }

    const policy = await this.leavePolicyService.getById(dto.leavePolicyId);
    if (!policy.isActive) {
      throw new ValidationError('Leave policy is not active');
    }

    const leaveRequest = await this.leaveRequestRepository.create({
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return leaveRequest;
  }

  async submit(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.DRAFT) {
      throw new ValidationError(
        `Cannot submit leave request with status ${leaveRequest.status}`,
      );
    }

    const employee = await this.employeeService.getById(leaveRequest.employeeId);
    if (employee.employmentStatus !== 'ACTIVE') {
      throw new ValidationError('Employee is not active');
    }

    const policy = await this.leavePolicyService.getById(leaveRequest.leavePolicyId);
    if (!policy.isActive) {
      throw new ValidationError('Leave policy is not active');
    }

    const isEmergency = policy.leaveType === LeaveType.EMERGENCY;

    if (!isEmergency && policy.minimumNoticeDays !== null && policy.minimumNoticeDays !== undefined) {
      const now = new Date();
      const noticeMs = leaveRequest.startDate.getTime() - now.getTime();
      const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));
      if (noticeDays < policy.minimumNoticeDays) {
        throw new ValidationError(
          `Leave request requires ${policy.minimumNoticeDays} days notice, but only ${noticeDays} days provided`,
        );
      }
    }

    const overlapping = await this.leaveRequestRepository.findOverlapping(
      leaveRequest.employeeId,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.id,
    );

    if (overlapping.length > 0) {
      throw new ConflictError('Employee has overlapping leave requests');
    }

    const daysRequested = this.computeDays(leaveRequest.startDate, leaveRequest.endDate);
    const fiscalYear = leaveRequest.startDate.getFullYear();

    const remainingDays = await this.leaveBalanceService.getRemainingDays(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
    );

    if (remainingDays < daysRequested) {
      throw new ValidationError(
        `Insufficient leave balance: requested ${daysRequested} days but only ${remainingDays} remaining`,
      );
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.SUBMITTED,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    return updated;
  }

  async approve(id: string, approverId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.SUBMITTED) {
      throw new ValidationError(
        `Cannot approve leave request with status ${leaveRequest.status}`,
      );
    }

    const fiscalYear = leaveRequest.startDate.getFullYear();

    await this.leaveBalanceService.deductDays(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
      leaveRequest.startDate,
      leaveRequest.endDate,
    );

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    return updated;
  }

  async reject(id: string, approverId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.SUBMITTED) {
      throw new ValidationError(
        `Cannot reject leave request with status ${leaveRequest.status}`,
      );
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.REJECTED,
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    return updated;
  }

  async cancel(id: string, cancelledBy: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    if (
      leaveRequest.status !== LeaveStatus.APPROVED &&
      leaveRequest.status !== LeaveStatus.SUBMITTED
    ) {
      throw new ValidationError(
        `Cannot cancel leave request with status ${leaveRequest.status}`,
      );
    }

    if (leaveRequest.status === LeaveStatus.APPROVED) {
      const daysRequested = this.computeDays(leaveRequest.startDate, leaveRequest.endDate);
      const fiscalYear = leaveRequest.startDate.getFullYear();

      await this.leaveBalanceService.restoreDays(
        leaveRequest.employeeId,
        leaveRequest.leavePolicyId,
        fiscalYear,
        daysRequested,
      );
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveStatus.CANCELLED,
      cancelledBy: cancelledBy,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    return updated;
  }

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.DRAFT) {
      throw new ValidationError(
        `Cannot update leave request with status ${leaveRequest.status}`,
      );
    }

    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      throw new ValidationError('endDate must be on or after startDate');
    }

    const updateData: Partial<LeaveRequest> = {
      ...dto,
      updatedAt: new Date(),
    };

    const updated = await this.leaveRequestRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }

    return updated;
  }

  async getById(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError(`LeaveRequest with id ${id} not found`);
    }
    return leaveRequest;
  }

  async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    if (params.employeeId) {
      return this.leaveRequestRepository.findByEmployeeId(params.employeeId);
    }

    if (params.status) {
      return this.leaveRequestRepository.findByStatus(params.status);
    }

    if (params.startDate && params.endDate) {
      return this.leaveRequestRepository.findByDateRange(params.startDate, params.endDate);
    }

    return this.leaveRequestRepository.findAll();
  }

  async getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.findByEmployeeId(employeeId);
  }

  private computeDays(startDate: Date, endDate: Date): number {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const diffMs = endMs - startMs;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }
}
