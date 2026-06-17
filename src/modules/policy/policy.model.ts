export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';
  entitlementDays: number;
  accrualRate?: number;
  maxCarryover?: number;
  validityStart: Date;
  validityEnd?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
