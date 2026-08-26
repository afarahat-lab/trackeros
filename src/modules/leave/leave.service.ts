import { LeaveStatus } from '../../shared/types/index';
import { AuditAction } from '../audit/audit.model';
import { IBalanceRepository } from '../balance/balance.repository.interface';
import { IAuditRepository } from '../audit/audit.repository.interface';
import { IPolicyRepository } from '../policy/policy.repository.interface';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { ILeaveService } from './leave.service.interface';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  LeaveRequestQueryParams,
  countLeaveDays,
} from './leave.model';

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepo: ILeaveRequestRepository,
    private readonly balanceRepo: IBalanceRepository,
    private readonly auditRepo: IAuditRepository,
    private readonly policyRepo: IPolicyRepository,
  ) {}

  async submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (dto.startDate >= dto.endDate) {
      throw new Error('startDate must be before endDate');
    }

    const days = countLeaveDays(dto.startDate, dto.endDate);
    const year = dto.startDate.getFullYear();

    const referencedPolicy = await this.policyRepo.findById(dto.policyId);
    if (!referencedPolicy) {
      throw new Error('Policy not found');
    }
    if (!referencedPolicy.isActive) {
      throw new Error('Policy not found');
    }

    const policy = await this.policyRepo.findActiveByLeaveType(referencedPolicy.leaveType);
    if (!policy) {
      throw new Error('Active leave policy not found');
    }

    if (policy.minimumNoticeDays !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const noticeDays = countLeaveDays(today, dto.startDate);
      if (noticeDays < policy.minimumNoticeDays) {
        throw new Error('Minimum notice period not met');
      }
    }

    const balance = await this.balanceRepo.getOrCreateForYear(
      dto.employeeId,
      dto.policyId,
      year,
      policy.entitlementDays,
    );

    const available = balance.entitlementDays - balance.usedDays - balance.pendingDays;
    if (available < days) {
      throw new Error('Insufficient leave balance');
    }

    balance.pendingDays += days;
    await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays);

    const request = await this.leaveRepo.create({
      employeeId: dto.employeeId,
      policyId: dto.policyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
    });

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: request.id,
      action: AuditAction.CREATE,
      oldValues: null,
      newValues: {
        employeeId: dto.employeeId,
        policyId: dto.policyId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days,
        status: LeaveStatus.PENDING,
      },
      performedBy: dto.employeeId,
      performedAt: new Date(),
    });

    return request;
  }

  async approve(requestId: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepo.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new Error('Only PENDING requests can be approved');
    }

    const days = countLeaveDays(request.startDate, request.endDate);
    const year = request.startDate.getFullYear();

    const overlapping = await this.leaveRepo.findApprovedOverlapping(
      request.employeeId,
      request.startDate,
      request.endDate,
      requestId,
    );
    if (overlapping.length > 0) {
      throw new Error('Overlapping approved leave request exists');
    }

    const balance = await this.balanceRepo.findByEmployeePolicyAndYear(
      request.employeeId,
      request.policyId,
      year,
    );
    if (!balance) {
      throw new Error('No leave balance found');
    }

    const available = balance.entitlementDays - balance.usedDays - balance.pendingDays;
    if (available < days) {
      throw new Error('Insufficient leave balance');
    }

    balance.pendingDays -= days;
    balance.usedDays += days;
    await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays);

    const updated = await this.leaveRepo.updateStatus(
      requestId,
      LeaveStatus.APPROVED,
      approverId,
      new Date(),
    );

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: AuditAction.APPROVE,
      oldValues: { status: LeaveStatus.PENDING },
      newValues: { status: LeaveStatus.APPROVED, approvedBy: approverId, days },
      performedBy: approverId,
      performedAt: new Date(),
    });

    return updated;
  }

  async reject(requestId: string, rejectorId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepo.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new Error('Only PENDING requests can be rejected');
    }

    const days = countLeaveDays(request.startDate, request.endDate);
    const year = request.startDate.getFullYear();

    const balance = await this.balanceRepo.findByEmployeePolicyAndYear(
      request.employeeId,
      request.policyId,
      year,
    );
    if (!balance) {
      throw new Error('No leave balance found');
    }

    balance.pendingDays -= days;
    await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays);

    const updated = await this.leaveRepo.updateStatus(
      requestId,
      LeaveStatus.REJECTED,
      null,
      null,
    );

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: AuditAction.REJECT,
      oldValues: { status: LeaveStatus.PENDING },
      newValues: { status: LeaveStatus.REJECTED, rejectedBy: rejectorId, days },
      performedBy: rejectorId,
      performedAt: new Date(),
    });

    return updated;
  }

  async cancel(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepo.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new Error('Only the request owner can cancel the request');
    }

    const days = countLeaveDays(request.startDate, request.endDate);
    const year = request.startDate.getFullYear();

    if (request.status === LeaveStatus.PENDING) {
      const balance = await this.balanceRepo.findByEmployeePolicyAndYear(
        request.employeeId,
        request.policyId,
        year,
      );
      if (!balance) {
        throw new Error('No leave balance found');
      }
      balance.pendingDays -= days;
      await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays);
    } else if (request.status === LeaveStatus.APPROVED) {
      const balance = await this.balanceRepo.findByEmployeePolicyAndYear(
        request.employeeId,
        request.policyId,
        year,
      );
      if (!balance) {
        throw new Error('No leave balance found');
      }
      balance.usedDays -= days;
      await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays);
    } else {
      throw new Error('Cannot cancel request in current status');
    }

    const updated = await this.leaveRepo.updateStatus(
      requestId,
      LeaveStatus.CANCELLED,
      null,
      null,
    );

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: AuditAction.DELETE,
      oldValues: { status: request.status },
      newValues: { status: LeaveStatus.CANCELLED, cancelledBy: employeeId, days },
      performedBy: employeeId,
      performedAt: new Date(),
    });

    return updated;
  }

  async getById(requestId: string): Promise<LeaveRequest | null> {
    return this.leaveRepo.findById(requestId);
  }

  async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    if (!params.employeeId) {
      return [];
    }
    return this.leaveRepo.findByEmployee(params.employeeId, params);
  }
}
