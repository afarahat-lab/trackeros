export interface LeaveRequest {
    id: string;
    employeeId: string;
    type: 'annual' | 'sick' | 'emergency';
    startDate: Date;
    endDate: Date;
    status: 'pending' | 'approved' | 'rejected';
    managerId: string;
    managerComment?: string;
    createdAt: Date;
    reason: string;
    updatedAt: Date;
    leaveType: string;
}
