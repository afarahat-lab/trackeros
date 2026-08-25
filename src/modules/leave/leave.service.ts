import { LeaveStatus } from 'shared/types';
import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams, countLeaveDays } from './leave.model';
import { ILeaveService } from './leave.service.interface';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { IBalanceRepository } from 'modules/balance/balance.repository.interface';
import { IAuditRepository } from 'modules/audit/audit.repository.interface';
import { IPolicyRepository } from 'modules/policy/policy.repository.interface';
import { AuditAction } from 'modules/audit/audit.model';

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

    const policy = await this.policyRepo.findById(dto.policyId);
    if (!policy || !policy.isActive) {
      throw new Error('Active leave policy not found');
    }

    if (policy.minimumNoticeDays !== undefined && policy.minimumNoticeDays > 0) {
      const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      const daysUntilStart = Math.floor((dto.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilStart < policy.minimumNoticeDays) {
        throw new Error('Minimum notice period not met');
      }
    }

    const balance = await this.balanceRepo.getOrCreateForYear(dto.employeeId, dto.policyId, year, policy.entitlementDays);

    const available = balance.entitlementDays - balance.usedDays - balance.pendingDays;
    if (available < days) {
      throw new Error('Insufficient leave balance');
    }

    await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays + days);

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
        startDate: dto.startDate.toISOString(),
        endDate: dto.endDate.toISOString(),
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

    const balance = await this.balanceRepo.findByEmployeePolicyAndYear(request.employeeId, request.policyId, year);
    if (!balance) {
      throw new Error('No leave balance found');
    }

    const available = balance.entitlementDays - balance.usedDays - balance.pendingDays;
    if (available < days) {
      throw new Error('Insufficient leave balance');
    }

    await this.balanceRepo.updateCounters(balance.id, balance.usedDays + days, balance.pendingDays - days);

    const updated = await this.leaveRepo.updateStatus(requestId, LeaveStatus.APPROVED, approverId, new Date());

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

    const balance = await this.balanceRepo.findByEmployeePolicyAndYear(request.employeeId, request.policyId, year);
    if (!balance) {
      throw new Error('No leave balance found');
    }

    await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays - days);

    const updated = await this.leaveRepo.updateStatus(requestId, LeaveStatus.REJECTED, null, null);

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
      const balance = await this.balanceRepo.findByEmployeePolicyAndYear(request.employeeId, request.policyId, year);
      if (!balance) {
        throw new Error('No leave balance found');
      }
      await this.balanceRepo.updateCounters(balance.id, balance.usedDays, balance.pendingDays - days);
    } else if (request.status === LeaveStatus.APPROVED) {
      const balance = await this.balanceRepo.findByEmployeePolicyAndYear(request.employeeId, request.policyId, year);
      if (!balance) {
        throw new Error('No leave balance found');
      }
      await this.balanceRepo.updateCounters(balance.id, balance.usedDays - days, balance.pendingDays);
    } else {
      throw new Error('Cannot cancel request in current status');
    }

    const updated = await this.leaveRepo.updateStatus(requestId, LeaveStatus.CANCELLED, null, null);

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
    if (params.employeeId) {
      return this.leaveRepo.findByEmployee(params.employeeId, params);
    }
    return [];
  }
}
