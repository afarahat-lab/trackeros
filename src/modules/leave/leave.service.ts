import { Employee } from '../employee/employee.model';
import { LeaveBalance } from '../balance/balance.model';
import { ILeaveRepository } from './leave.repository';

export class LeaveService {
    private leaveRepository: ILeaveRepository;

    constructor(leaveRepository: ILeaveRepository) {
        this.leaveRepository = leaveRepository;
    }

    // Additional methods for LeaveService would go here
}
