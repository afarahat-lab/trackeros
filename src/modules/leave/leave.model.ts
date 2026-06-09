export interface LeaveRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: string; // e.g., pending, approved, rejected
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
