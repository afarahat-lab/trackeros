export interface LeavePolicy {
  id: string;
  leaveType: 'annual' | 'sick' | 'emergency';
  annualEntitlement: number;
  maxConsecutiveDays: number;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  documentationThresholdDays: number;
  carryOverAllowed: boolean;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
