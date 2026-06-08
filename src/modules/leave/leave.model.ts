import { LeaveType } from '../../shared/types/index';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    status: 'pending' | 'approved' | 'rejected';
    managerId?: string;
    managerComment?: string;
    createdAt: Date;
}

export interface CreateLeaveRequestDto {
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
}

export interface LeaveBalance {
    employeeId: string;
    leaveTypeId: string;
    balance: number;
}
