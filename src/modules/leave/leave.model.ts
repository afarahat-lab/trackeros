import { LeaveType } from '../../shared/types/index';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    status: string; // pending | approved | rejected
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
}
