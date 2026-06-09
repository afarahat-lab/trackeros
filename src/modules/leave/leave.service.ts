import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { ILeaveRepository } from './leave.repository';

export class LeaveService {
    private leaveRepository: ILeaveRepository;

    constructor(leaveRepository: ILeaveRepository) {
        this.leaveRepository = leaveRepository;
    }

    async getAllLeaveRequests(userId: string): Promise<LeaveRequest[]> {
        return this.leaveRepository.findByUserId(userId);
    }

    async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        // Logic to create a leave request
    }

    async updateLeaveRequest(id: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        // Logic to update a leave request
    }
}
