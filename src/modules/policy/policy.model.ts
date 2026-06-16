export interface LeavePolicy {
  id: string;
  leaveType: string;
  entitlementRules: Record<string, any>;
  accrualFrequency: string;
  carryOverLimit: number;
  advanceNoticeDays: number;
  maxConsecutiveDays: number;
  requiresManagerApproval: boolean;
  validFrom: Date;
  validTo: Date;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}
