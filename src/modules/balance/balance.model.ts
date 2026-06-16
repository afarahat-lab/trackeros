export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  entitlementDays: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}
