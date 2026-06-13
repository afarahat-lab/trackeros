export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  entitlementDays: number;
  usedDays: number;
  remainingDays: number;
  accrualRate?: number;
  accrualFrequency?: string;
  fiscalYear: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}
