import { ILeaveService } from './leave.service.interface';
import { ILeaveRepository } from './leave.repository';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveStatus } from '../../shared/types/leave.types';

export class LeaveService implements ILeaveService {
  constructor(private readonly leaveRepository: ILeaveRepository) {}

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (dto.startDate >= dto.endDate) {
      throw new Error('startDate must be before endDate');
    }

    return this.leaveRepository.create(dto);
  }

  async approveLeave(id: string, approverId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepository.findById(id);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new Error('Only PENDING leave requests can be approved');
    }

    const updated = await this.leaveRepository.update(id, {
      status: LeaveStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to approve leave request');
    }

    return updated;
  }

  async rejectLeave(id: string, rejecterId: string, reason: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepository.findById(id);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new Error('Only PENDING leave requests can be rejected');
    }

    const updated = await this.leaveRepository.update(id, {
      status: LeaveStatus.REJECTED,
      rejectedBy: rejecterId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    if (!updated) {
      throw new Error('Failed to reject leave request');
    }

    return updated;
  }

  async cancelLeave(id: string, cancellerId: string, reason: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepository.findById(id);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      throw new Error('Only APPROVED leave requests can be cancelled');
    }

    const updated = await this.leaveRepository.update(id, {
      status: LeaveStatus.CANCELLED,
      cancelledBy: cancellerId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    if (!updated) {
      throw new Error('Failed to cancel leave request');
    }

    return updated;
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(id);
  }

  async getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployeeId(employeeId);
  }

  async getLeaveRequestsByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByStatus(status);
  }
}
