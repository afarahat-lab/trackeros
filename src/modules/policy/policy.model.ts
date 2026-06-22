export interface LeavePolicy {
  id: string;
  leaveTypeId: string;
  maxDaysPerYear: number;
  maxConsecutiveDays: number | null;
  requiresApproval: boolean;
  minNoticeDays: number;
  createdAt: Date;
  updatedAt: Date;
}
