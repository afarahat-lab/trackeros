import { Employee } from '../employee/employee.model';
import { LeaveBalance } from '../balance/balance.model';
import { ILeaveRepository } from './leave.repository';

export class LeaveService {
    constructor(private leaveRepository: ILeaveRepository) {}

    // Business logic methods will go here
}
