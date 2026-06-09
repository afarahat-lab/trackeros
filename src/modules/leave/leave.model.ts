export interface LeaveRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    status: string;
    reason: string;
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
