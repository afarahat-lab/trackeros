export interface LeavePolicy {
  id: string;
  name: string;
  leaveType: string;
  maxDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
