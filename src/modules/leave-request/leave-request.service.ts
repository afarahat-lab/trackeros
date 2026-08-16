import { LeaveRequest } from './leave-request.model';
import { ILeaveRequestRepository } from './leave-request.repository';
import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository';
import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { ILeaveRequestService } from './leave-request.service.interface';
import {
  CreateLeaveRequestDto,
  LeaveRequestQueryParams,
  LeaveStatus,
} from '../../shared/types';

function calculateDaysRequested(startDate: Date, endDate: Date): number {
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly leaveRequestRepo: ILeaveRequestRepository,
    private readonly leaveBalanceRepo: ILeaveBalanceRepository,
    private readonly leavePolicyRepo: ILeavePolicyRepository,
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const employee = await this.employeeRepo.findById(dto.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    const policy = await this.leavePolicyRepo.findById(dto.leavePolicyId);
    if (!policy) {
      throw { error: 'Leave policy not found', code: 'POLICY_NOT_FOUND' };
    }
    if (!policy.isActive) {
      throw { error: 'Leave policy is not active', code: 'POLICY_INACTIVE' };
    }

    if (dto.startDate > dto.endDate) {
      throw { error: 'startDate must be on or before endDate', code: 'INVALID_DATE_RANGE' };
    }

    return this.leaveRequestRepo.create({
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      cancelledAt: null,
    });
  }

  async submit(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(id);
    if (!request) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== LeaveStatus.DRAFT) {
      throw {
        error: 'Only DRAFT requests can be submitted',
        code: 'INVALID_STATE_TRANSITION',
      };
    }

    const policy = await this.leavePolicyRepo.findById(request.leavePolicyId);
    if (!policy) {
      throw { error: 'Leave policy not found', code: 'POLICY_NOT_FOUND' };
    }

    if (policy.minimumNoticeDays !== null) {
      const now = new Date();
      const noticeDeadline = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + policy.minimumNoticeDays,
      );
      if (request.startDate < noticeDeadline) {
        throw {
          error: `Minimum notice of ${policy.minimumNoticeDays} days required`,
          code: 'MINIMUM_NOTICE_VIOLATION',
        };
      }
    }

    const daysRequested = calculateDaysRequested(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getFullYear();

    const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
      request.employeeId,
      request.leavePolicyId,
      fiscalYear,
    );
    if (!balance) {
      throw { error: 'Leave balance not found', code: 'BALANCE_NOT_FOUND' };
    }

    if (balance.status === 'CLOSED') {
      throw { error: 'Leave balance is closed', code: 'BALANCE_CLOSED' };
    }

    if (balance.remainingDays < daysRequested) {
      throw {
        error: `Insufficient balance: ${balance.remainingDays} remaining, ${daysRequested} requested`,
        code: 'INSUFFICIENT_BALANCE',
      };
    }

    const updated = await this.leaveRequestRepo.update(id, {
      status: LeaveStatus.SUBMITTED,
    });
    if (!updated) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }
    return updated;
  }

  async approve(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(id);
    if (!request) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw {
        error: 'Only SUBMITTED requests can be approved',
        code: 'INVALID_STATE_TRANSITION',
      };
    }

    const employee = await this.employeeRepo.findById(request.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    if (employee.managerId !== approverId) {
      throw {
        error: 'Only the employee\'s manager can approve this request',
        code: 'NOT_MANAGER',
      };
    }

    const daysRequested = calculateDaysRequested(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getFullYear();

    const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
      request.employeeId,
      request.leavePolicyId,
      fiscalYear,
    );
    if (!balance) {
      throw { error: 'Leave balance not found', code: 'BALANCE_NOT_FOUND' };
    }

    if (balance.status === 'CLOSED') {
      throw { error: 'Leave balance is closed', code: 'BALANCE_CLOSED' };
    }

    const newUsedDays = balance.usedDays + daysRequested;
    const newRemainingDays = balance.totalEntitlement - newUsedDays;

    await this.leaveBalanceRepo.update(balance.id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
    });

    const now = new Date();
    const updated = await this.leaveRequestRepo.update(id, {
      status: LeaveStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: now,
    });
    if (!updated) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }
    return updated;
  }

  async reject(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(id);
    if (!request) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw {
        error: 'Only SUBMITTED requests can be rejected',
        code: 'INVALID_STATE_TRANSITION',
      };
    }

    const employee = await this.employeeRepo.findById(request.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    if (employee.managerId !== approverId) {
      throw {
        error: 'Only the employee\'s manager can reject this request',
        code: 'NOT_MANAGER',
      };
    }

    const updated = await this.leaveRequestRepo.update(id, {
      status: LeaveStatus.REJECTED,
    });
    if (!updated) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }
    return updated;
  }

  async cancel(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(id);
    if (!request) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }

    if (request.status !== LeaveStatus.SUBMITTED && request.status !== LeaveStatus.APPROVED) {
      throw {
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      };
    }

    if (request.status === LeaveStatus.APPROVED) {
      const daysRequested = calculateDaysRequested(request.startDate, request.endDate);
      const fiscalYear = request.startDate.getFullYear();

      const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
        request.employeeId,
        request.leavePolicyId,
        fiscalYear,
      );
      if (!balance) {
        throw { error: 'Leave balance not found', code: 'BALANCE_NOT_FOUND' };
      }

      if (balance.status === 'CLOSED') {
        throw { error: 'Leave balance is closed', code: 'BALANCE_CLOSED' };
      }

      const newUsedDays = balance.usedDays - daysRequested;
      const newRemainingDays = balance.totalEntitlement - newUsedDays;

      await this.leaveBalanceRepo.update(balance.id, {
        usedDays: newUsedDays,
        remainingDays: newRemainingDays,
      });
    }

    const now = new Date();
    const updated = await this.leaveRequestRepo.update(id, {
      status: LeaveStatus.CANCELLED,
      cancelledAt: now,
    });
    if (!updated) {
      throw { error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' };
    }
    return updated;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRequestRepo.findById(id);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.findByEmployeeId(employeeId);
  }

  async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.query(params);
  }
}
