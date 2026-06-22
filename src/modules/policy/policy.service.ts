import { ILeavePolicyRepository } from './policy.repository';
import { LeavePolicy, CreateLeavePolicyDto } from './policy.model';
import { AppError } from '../../shared/types';

export interface IPolicyService {
  getPolicyById(id: string): Promise<LeavePolicy>;
  getPolicyByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy>;
  createPolicy(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  updatePolicy(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy>;
  archivePolicy(id: string): Promise<LeavePolicy>;
}

export class PolicyService implements IPolicyService {
  constructor(private readonly policyRepository: ILeavePolicyRepository) {}

  async getPolicyById(id: string): Promise<LeavePolicy> {
    if (!id || typeof id !== 'string') throw new AppError('Invalid policy ID', 400);
    const policy = await this.policyRepository.findById(id);
    if (!policy) throw new AppError('Leave policy not found', 404);
    return policy;
  }

  async getPolicyByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy> {
    if (!leaveTypeId || typeof leaveTypeId !== 'string') throw new AppError('Invalid leave type ID', 400);
    const policy = await this.policyRepository.findByLeaveTypeId(leaveTypeId);
    if (!policy) throw new AppError('Leave policy not found for the given leave type', 404);
    return policy;
  }

  async createPolicy(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    if (!dto.leaveTypeId || dto.maxDaysPerYear === undefined || dto.maxConsecutiveDays === undefined) {
      throw new AppError('Missing required fields for leave policy', 400);
    }
    return this.policyRepository.create(dto);
  }

  async updatePolicy(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy> {
    if (!id || typeof id !== 'string') throw new AppError('Invalid policy ID', 400);
    return this.policyRepository.update(id, dto);
  }

  async archivePolicy(id: string): Promise<LeavePolicy> {
    if (!id || typeof id !== 'string') throw new AppError('Invalid policy ID', 400);
    return this.policyRepository.archive(id);
  }
}
