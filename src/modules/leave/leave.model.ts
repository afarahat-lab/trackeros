import { LeaveType } from '../../shared/types/index';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    type: LeaveType;
    startDate: Date;
    endDate: Date;
    status: 'pending' | 'approved' | 'rejected';
    managerId?: string;
    managerComment?: string;
    createdAt: Date;
}

export interface CreateLeaveRequestDto {
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
}
