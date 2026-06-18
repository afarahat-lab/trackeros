export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';
  entitlementDays: number;
  maxConsecutiveDays: number | null;
  minNoticeDays: number;
  requiresApproval: boolean;
  carryOverLimit: number;
  validityStart: Date;
  validityEnd: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
