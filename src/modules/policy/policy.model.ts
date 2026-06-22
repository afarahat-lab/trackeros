import { LeaveType } from '../../shared/types/index';

export interface LeavePolicy {
  id: string;
  leaveTypeId: string;
  maxDaysPerYear: number;
  maxConsecutiveDays: number;
  requiresApproval: boolean;
  allowNegativeBalance: boolean;
  blackoutDates: Date[];
  status: 'active' | 'archived';
}

export interface CreateLeavePolicyDto {
  leaveTypeId: string;
  maxDaysPerYear: number;
  maxConsecutiveDays: number;
  requiresApproval?: boolean;
  allowNegativeBalance?: boolean;
  blackoutDates?: Date[];
  status?: 'active' | 'archived';
}
