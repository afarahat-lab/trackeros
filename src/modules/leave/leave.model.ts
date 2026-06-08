import { LeaveType } from '../../shared/types/index';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    status: string;
}

export interface CreateLeaveRequestDto {
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
}
