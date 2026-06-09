export interface LeaveRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: string;
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
