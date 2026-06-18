export interface LeavePolicy {
  id: string;
  name: string;
  leaveType: 'annual' | 'sick' | 'emergency';
  maxDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeavePolicyDto {
  name: string;
  leaveType: 'annual' | 'sick' | 'emergency';
  maxDays: number;
  isActive?: boolean;
}
