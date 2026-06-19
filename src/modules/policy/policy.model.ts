export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: string;
  entitlementDays: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
