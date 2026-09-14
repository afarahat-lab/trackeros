import { LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';
import { PgLeavePolicyRepository } from './policy.repository';
import { PolicyService } from './policy.service';
import { IPolicyService } from './policy.service.interface';

export function createPolicyService(): IPolicyService {
  return new PolicyService(
    new PgLeavePolicyRepository(),
    new LeaveTypeService(new PgLeaveTypeRepository()),
  );
}

export { LeavePolicy, CreateLeavePolicyInput, LeavePolicyStatus } from './policy.model';
export { IPolicyRepository } from './policy.repository.interface';
export { PgLeavePolicyRepository } from './policy.repository';
export { IPolicyService } from './policy.service.interface';
export { PolicyService } from './policy.service';
