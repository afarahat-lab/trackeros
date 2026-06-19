import { LeavePolicyDto } from './policy.dto';

export interface PolicyService {
  getPolicyById(id: string): Promise<LeavePolicyDto | null>;
  getActivePolicies(): Promise<LeavePolicyDto[]>;
}
