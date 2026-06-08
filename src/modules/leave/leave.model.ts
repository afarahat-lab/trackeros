export interface LeaveRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    status: string; // pending | approved | rejected
    reason: string;
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
