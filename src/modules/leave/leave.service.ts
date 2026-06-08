import { LeaveRequest } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { LeavePolicy } from './leave.policy'; // Assuming you have a LeavePolicy model
import { Employee } from '../employee/employee.model'; // Assuming you have an Employee model
import { LeaveBalance } from '../balance/balance.model'; // Assuming you have a LeaveBalance model

export class LeaveService {
    constructor(private leaveRepository: ILeaveRepository) {}

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        await this.validateLeaveRequest(leaveRequest);
        leaveRequest.status = 'pending';
        leaveRequest.createdAt = new Date();
        leaveRequest.updatedAt = new Date();
        return this.leaveRepository.create(leaveRequest);
    }

    private async validateLeaveRequest(leaveRequest: LeaveRequest): Promise<void> {
        const employeeId = leaveRequest.employeeId;
        const leaveType = leaveRequest.leaveType;
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);

        // Check for overlapping leave requests
        const overlappingRequests = await this.leaveRepository.findOverlappingRequests(employeeId, startDate, endDate);
        if (overlappingRequests.length > 0) {
            throw new Error('Leave request overlaps with existing requests.');
        }

        // Check leave balance if not emergency leave
        if (leaveType !== 'emergency') {
            const leaveBalance = await this.leaveRepository.getLeaveBalance(employeeId, leaveType);
            if (leaveBalance.totalDays - leaveBalance.usedDays <= 0) {
                throw new Error('Insufficient leave balance.');
            }
        }
    }

    async approveLeaveRequest(requestId: string, managerId: string, comment: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.findById(requestId);
        if (!leaveRequest) {
            throw new Error('Leave request not found.');
        }
        if (leaveRequest.managerId !== managerId) {
            throw new Error('Only the assigned manager can approve this request.');
        }
        leaveRequest.status = 'approved';
        leaveRequest.managerComment = comment;
        leaveRequest.updatedAt = new Date();
        return this.leaveRepository.update(leaveRequest);
    }

    async rejectLeaveRequest(requestId: string, managerId: string, comment: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.findById(requestId);
        if (!leaveRequest) {
            throw new Error('Leave request not found.');
        }
        if (leaveRequest.managerId !== managerId) {
            throw new Error('Only the assigned manager can reject this request.');
        }
        leaveRequest.status = 'rejected';
        leaveRequest.managerComment = comment;
        leaveRequest.updatedAt = new Date();
        return this.leaveRepository.update(leaveRequest);
    }
}
