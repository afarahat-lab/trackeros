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
    reason: string; // New property
    updatedAt: Date; // New property
    leaveType: string; // New property
}
