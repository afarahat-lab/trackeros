export interface LeaveType {
  id: string;
  code: string;
  label: string;
  description: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
