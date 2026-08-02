import { LeaveType } from '../../shared/types/index';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'FROZEN';
  createdAt: Date;
  updatedAt: Date;
}
