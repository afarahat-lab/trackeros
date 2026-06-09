import { LeaveRequest } from './leave.model';

export class LeaveRepository {
    private leaveRequests: LeaveRequest[] = [];

    public create(leaveRequest: LeaveRequest): LeaveRequest {
        this.leaveRequests.push(leaveRequest);
        return leaveRequest;
    }

    public findById(id: string): LeaveRequest | undefined {
        return this.leaveRequests.find(request => request.id === id);
    }

    public findAll(): LeaveRequest[] {
        return this.leaveRequests;
    }
}
