export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
  entitlementDays: number;
  accrualRate: number | null;
  maxCarryover: number | null;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeavePolicyDto {
  policyName: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
  entitlementDays: number;
  accrualRate?: number;
  maxCarryover?: number;
  requiresApproval?: boolean;
  isActive?: boolean;
}

export interface UpdateLeavePolicyDto {
  policyName?: string;
  leaveType?: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
  entitlementDays?: number;
  accrualRate?: number | null;
  maxCarryover?: number | null;
  requiresApproval?: boolean;
  isActive?: boolean;
}
