import { LeaveRequest } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { LeaveBalance } from '../balance/balance.model';

export class LeaveService {
    constructor(private leaveRepository: ILeaveRepository) {}

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        await this.validateLeaveRequest(leaveRequest);
        return this.leaveRepository.createLeaveRequest(leaveRequest);
    }

    private async validateLeaveRequest(leaveRequest: LeaveRequest): Promise<void> {
        const leaveBalance = await this.leaveRepository.getLeaveBalance(leaveRequest.employeeId, leaveRequest.leaveType);
        
        if (!leaveBalance || leaveBalance.totalDays - leaveBalance.usedDays < this.calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate)) {
            throw new Error('Insufficient leave balance');
        }

        const overlappingRequests = await this.leaveRepository.getOverlappingLeaveRequests(leaveRequest.employeeId, leaveRequest.startDate, leaveRequest.endDate);
        if (overlappingRequests.length > 0) {
            throw new Error('Overlapping leave requests found');
        }
    }

    private calculateLeaveDays(startDate: Date, endDate: Date): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end dates
    }
}
