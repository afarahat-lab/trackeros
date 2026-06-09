import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { ILeaveRepository } from './leave.repository';

export class LeaveService {
  private leaveRepository: ILeaveRepository;

  constructor(leaveRepository: ILeaveRepository) {
    this.leaveRepository = leaveRepository;
  }

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Validate leave request
    if (!dto.employeeId || !dto.leaveType || !dto.startDate || !dto.endDate) {
      throw new Error('All fields are required');
    }

    // Check for overlapping leave requests
    const existingRequest = await this.leaveRepository.getLeaveRequestById(dto.employeeId);
    if (existingRequest && this.isOverlapping(existingRequest, dto)) {
      throw new Error('Leave request overlaps with an existing request');
    }

    const newLeaveRequest: LeaveRequest = {
      id: this.generateId(),
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.leaveRepository.createLeaveRequest(newLeaveRequest);
  }

  private isOverlapping(existingRequest: LeaveRequest, newRequest: CreateLeaveRequestDto): boolean {
    return (
      (newRequest.startDate >= existingRequest.startDate && newRequest.startDate <= existingRequest.endDate) ||
      (newRequest.endDate >= existingRequest.startDate && newRequest.endDate <= existingRequest.endDate)
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
