import { LeaveRequest } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { LeavePolicy } from '../policy/policy.model';
import { LeaveBalance } from '../balance/balance.model';

export class LeaveService {
    constructor(private leaveRepository: ILeaveRepository) {}

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        await this.validateLeaveRequest(leaveRequest);
        return this.leaveRepository.createLeaveRequest(leaveRequest);
    }

    private async validateLeaveRequest(leaveRequest: LeaveRequest): Promise<void> {
        const leaveBalance = await this.leaveRepository.getLeaveBalance(leaveRequest.employeeId, leaveRequest.leaveType);
        if (!leaveBalance || leaveBalance.totalDays - leaveBalance.usedDays <= 0) {
            throw new Error('Insufficient leave balance');
        }

        const overlappingRequests = await this.leaveRepository.getOverlappingLeaveRequests(leaveRequest.employeeId, leaveRequest.startDate, leaveRequest.endDate);
        if (overlappingRequests.length > 0) {
            throw new Error('Overlapping leave requests found');
        }
    }

    async approveLeaveRequest(requestId: string, managerId: string, comment?: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.getLeaveRequestById(requestId);
        if (leaveRequest.managerId !== managerId) {
            throw new Error('Only the assigned manager can approve this request');
        }
        leaveRequest.status = 'approved';
        leaveRequest.managerComment = comment;
        return this.leaveRepository.updateLeaveRequest(leaveRequest);
    }

    async rejectLeaveRequest(requestId: string, managerId: string, comment?: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.getLeaveRequestById(requestId);
        if (leaveRequest.managerId !== managerId) {
            throw new Error('Only the assigned manager can reject this request');
        }
        leaveRequest.status = 'rejected';
        leaveRequest.managerComment = comment;
        return this.leaveRepository.updateLeaveRequest(leaveRequest);
    }
}
