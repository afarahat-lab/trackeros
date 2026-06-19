export interface LeavePolicyDto {
  id: string;
  policyName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';
  entitlementDays: number;
  accrualRate: number;
  maxCarryover: number;
  requiresApproval: boolean;
  minServiceDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
