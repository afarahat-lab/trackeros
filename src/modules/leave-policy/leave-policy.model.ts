export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number | undefined;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
