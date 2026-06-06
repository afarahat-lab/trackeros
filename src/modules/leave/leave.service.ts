import LeaveRepository from './leave.repository';
import { LeaveRequest } from './leave.model';

class LeaveService {
    private leaveRepository: LeaveRepository;

    constructor() {
        this.leaveRepository = new LeaveRepository();
    }

    async submitLeaveRequest(req: LeaveRequest): Promise<LeaveRequest> {
        return this.leaveRepository.createLeaveRequest(req);
    }
}

export default LeaveService;
