import { LeaveRequest } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { LeaveBalance } from '../balance/balance.model'; // Assuming LeaveBalance is defined in balance.model.ts
import { Employee } from '../employee/employee.model'; // Assuming Employee is defined in employee.model.ts

export class LeaveService {
    constructor(private leaveRepository: ILeaveRepository) {}

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        // Validate leave request
        await this.validateLeaveRequest(leaveRequest);

        // Process leave request
        return this.leaveRepository.createLeaveRequest(leaveRequest);
    }

    private async validateLeaveRequest(leaveRequest: LeaveRequest): Promise<void> {
        const { employeeId, leaveType, startDate, endDate } = leaveRequest;

        // Check for overlapping leave requests
        const overlappingRequests = await this.leaveRepository.findOverlappingRequests(employeeId, startDate, endDate);
        if (overlappingRequests.length > 0) {
            throw new Error('Leave request overlaps with existing requests.');
        }

        // Check leave balance if not emergency leave
        if (leaveType !== 'emergency') {
            const leaveBalance: LeaveBalance = await this.leaveRepository.getLeaveBalance(employeeId, leaveType);
            if (leaveBalance.totalDays - leaveBalance.usedDays <= 0) {
                throw new Error('Insufficient leave balance.');
            }
        }
    }

    async updateLeaveRequestStatus(id: string, status: string, managerId: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.getLeaveRequestById(id);
        if (!leaveRequest) {
            throw new Error('Leave request not found.');
        }

        if (leaveRequest.managerId !== managerId) {
            throw new Error('Only the assigned manager can approve/reject this request.');
        }

        leaveRequest.status = status;
        return this.leaveRepository.updateLeaveRequest(leaveRequest);
    }

    async getLeaveRequestById(id: string): Promise<LeaveRequest> {
        const leaveRequest = await this.leaveRepository.getLeaveRequestById(id);
        if (!leaveRequest) {
            throw new Error('Leave request not found.');
        }
        return leaveRequest;
    }
}
