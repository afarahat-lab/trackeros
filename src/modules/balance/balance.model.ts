import { BaseEntity } from '../../shared/types/index';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  year: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}
