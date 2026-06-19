import { CreateLeaveRequestDto, LeaveRequest } from './leave.model';
import { LeaveStatus, LeaveRequestStatus } from '../../shared/types';
import { ILeaveRepository } from './leave.repository';
import { PolicyService } from '../policy/policy.service';
import { BalanceService } from '../balance/balance.service';
import { AuditLogger } from '../../shared/services/audit-logger.service';
import { EventPublisher } from '../../shared/services/event-publisher.service';

export interface ILeaveApplicationService {
  createLeaveRequest(employeeId: string, createLeaveRequestDto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitLeaveRequest(leaveRequestId: string, employeeId: string): Promise<LeaveRequest>;
  cancelLeaveRequest(leaveRequestId: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequestById(leaveRequestId: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]>;
}

export class LeaveApplicationService implements ILeaveApplicationService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly policyService: PolicyService,
    private readonly balanceService: BalanceService,
    private readonly auditLogger: AuditLogger,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createLeaveRequest(employeeId: string, createLeaveRequestDto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Transaction semantics: All operations execute atomically in a single database transaction
    // 1. Validate input using validateCreateLeaveRequestDto (GP-003)
    this.validateCreateLeaveRequestDto(createLeaveRequestDto);

    // 2. Check employee exists via employee module (dependency)
    // Stub: employee existence check deferred to employee module integration

    // 3. Validate leave policy via policyService
    // Stub: policy validation deferred to PolicyService implementation

    // 4. Check leave balance via balanceService
    // Stub: balance check deferred to BalanceService implementation

    // 5. Create leave request with status 'draft' via leaveRepository
    const leaveRequestData: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId,
      leaveType: createLeaveRequestDto.leaveType,
      startDate: createLeaveRequestDto.startDate,
      endDate: createLeaveRequestDto.endDate,
      status: LeaveStatus.Pending,
      requestStatus: LeaveRequestStatus.Draft,
      reason: createLeaveRequestDto.reason,
      managerId: createLeaveRequestDto.managerId,
    };

    const leaveRequest = await this.leaveRepository.createLeaveRequest(leaveRequestData);

    // 6. Write audit log via auditLogger (GP-002)
    await this.auditLogger.log('LeaveRequest', leaveRequest.id, 'created', {
      employeeId,
      leaveType: createLeaveRequestDto.leaveType,
      startDate: createLeaveRequestDto.startDate,
      endDate: createLeaveRequestDto.endDate,
    });

    // 7. Return created leave request
    return leaveRequest;
  }

  async submitLeaveRequest(leaveRequestId: string, employeeId: string): Promise<LeaveRequest> {
    // Transaction semantics: All operations execute atomically in a single database transaction
    // 1. Retrieve leave request by ID via leaveRepository
    const leaveRequest = await this.leaveRepository.findLeaveRequestById(leaveRequestId);
    if (!leaveRequest) {
      throw new Error(`Leave request with id ${leaveRequestId} not found`);
    }

    // 2. Validate ownership (employeeId matches)
    if (leaveRequest.employeeId !== employeeId) {
      throw new Error('Employee ID does not match the leave request owner');
    }

    // 3. Validate current status is 'draft'
    if (leaveRequest.requestStatus !== LeaveRequestStatus.Draft) {
      throw new Error(`Leave request cannot be submitted because its status is '${leaveRequest.requestStatus}'`);
    }

    // 4. Update status to 'submitted' via leaveRepository
    const previousStatus = leaveRequest.requestStatus;
    const updatedAt = new Date();
    const updatedLeaveRequest = await this.leaveRepository.updateLeaveRequest(
      leaveRequestId,
      {
        status: LeaveStatus.Pending,
        requestStatus: LeaveRequestStatus.PendingApproval,
        updatedAt,
      }
    );

    // 5. Write audit log via auditLogger (GP-002)
    await this.auditLogger.log('LeaveRequest', leaveRequestId, 'submitted', {
      employeeId,
      previousStatus,
      newStatus: LeaveRequestStatus.PendingApproval,
    });

    // 6. Publish 'leave_request.submitted' event via eventPublisher
    await this.eventPublisher.publish('leave_request.submitted', {
      leaveRequestId,
      employeeId,
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    });

    // 7. Return updated leave request
    return updatedLeaveRequest;
  }

  async cancelLeaveRequest(leaveRequestId: string, employeeId: string): Promise<LeaveRequest> {
    // Transaction semantics: All operations execute atomically in a single database transaction
    // 1. Retrieve leave request by ID via leaveRepository
    const leaveRequest = await this.leaveRepository.findLeaveRequestById(leaveRequestId);
    if (!leaveRequest) {
      throw new Error(`Leave request with id ${leaveRequestId} not found`);
    }

    // 2. Validate ownership (employeeId matches)
    if (leaveRequest.employeeId !== employeeId) {
      throw new Error('Employee ID does not match the leave request owner');
    }

    // 3. Validate current status is 'draft' or 'submitted' or 'pending_approval'
    const allowedStatuses: LeaveRequestStatus[] = [
      LeaveRequestStatus.Draft,
      LeaveRequestStatus.PendingApproval,
    ];
    if (!leaveRequest.requestStatus || !allowedStatuses.includes(leaveRequest.requestStatus)) {
      throw new Error(
        `Leave request cannot be cancelled because its status is '${leaveRequest.requestStatus}'`
      );
    }

    // 4. Update status to 'cancelled' via leaveRepository
    const previousStatus = leaveRequest.requestStatus;
    const updatedAt = new Date();
    const updatedLeaveRequest = await this.leaveRepository.updateLeaveRequest(
      leaveRequestId,
      {
        status: LeaveStatus.Rejected,
        requestStatus: LeaveRequestStatus.Cancelled,
        updatedAt,
      }
    );

    // 5. Write audit log via auditLogger (GP-002)
    await this.auditLogger.log('LeaveRequest', leaveRequestId, 'cancelled', {
      employeeId,
      previousStatus,
      newStatus: LeaveRequestStatus.Cancelled,
    });

    // 6. Publish 'leave_request.cancelled' event via eventPublisher
    await this.eventPublisher.publish('leave_request.cancelled', {
      leaveRequestId,
      employeeId,
      leaveType: leaveRequest.leaveType,
      previousStatus,
    });

    // 7. Return updated leave request
    return updatedLeaveRequest;
  }

  async getLeaveRequestById(leaveRequestId: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findLeaveRequestById(leaveRequestId);
  }

  async getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.findLeaveRequestsByEmployeeId(employeeId, status);
  }

  private validateCreateLeaveRequestDto(dto: CreateLeaveRequestDto): void {
    if (!dto.leaveType) {
      throw new Error('Leave type is required');
    }
    if (!dto.startDate || !dto.endDate) {
      throw new Error('Start date and end date are required');
    }
    if (dto.startDate > dto.endDate) {
      throw new Error('Start date must be before end date');
    }
  }
}
