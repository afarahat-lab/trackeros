export interface LeavePolicy {
  id: string;
  leaveType: string;
  entitlementDays: number;
  accrualMethod?: string;
  maxAccumulation?: number;
  advanceLeaveAllowed: boolean;
  requiresDocumentation: boolean;
  noticePeriodDays: number;
  applicableEmploymentTypes: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
