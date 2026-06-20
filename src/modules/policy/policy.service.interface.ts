import { LeavePolicy, ValidationResult } from '../../shared/types';

export interface IPolicyService {
  getPolicy(leaveTypeId: string): Promise<LeavePolicy | null>;
  getPolicies(): Promise<LeavePolicy[]>;
  createPolicy(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  updatePolicy(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy>;
  deletePolicy(id: string): Promise<void>;
  validateRequest(employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date): Promise<ValidationResult>;
}
