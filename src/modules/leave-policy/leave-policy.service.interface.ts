import { LeavePolicy } from './leave-policy.model';

export interface ILeavePolicyService {
  getActivePolicy(leaveTypeId: string): Promise<LeavePolicy | null>;
  getPolicyById(id: string): Promise<LeavePolicy | null>;
  getAllPolicies(): Promise<LeavePolicy[]>;
  createPolicy(data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}
