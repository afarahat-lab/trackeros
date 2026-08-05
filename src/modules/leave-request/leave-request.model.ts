import { LeaveRequestStatus } from '../../shared/types/leave-request-status.enum';
import { Employee } from '../employee';
import { LeavePolicy } from '../leave-policy';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Reference types for foreign-key relationships — not used at runtime, only for type documentation. */
export type LeaveRequestEmployeeRef = Pick<Employee, 'id'>;
export type LeaveRequestPolicyRef = Pick<LeavePolicy, 'id'>;
