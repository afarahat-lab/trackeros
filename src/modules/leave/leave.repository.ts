import { LeaveRequest } from './leave.model';

export interface ILeaveRepository {
    createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
    getLeaveRequests(): Promise<LeaveRequest[]>;
}

export class LeaveRepository implements ILeaveRepository {
    private leaveRequests: LeaveRequest[] = [];

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        this.leaveRequests.push(leaveRequest);
        return leaveRequest;
    }

    async getLeaveRequests(): Promise<LeaveRequest[]> {
        return this.leaveRequests;
    }
}
