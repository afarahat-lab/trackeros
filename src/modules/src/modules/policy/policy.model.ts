export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';
  entitlementDays: number;
  maxConsecutiveDays?: number;
  advanceNoticeDays: number;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
