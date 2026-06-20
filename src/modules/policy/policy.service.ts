import { IPolicyService } from './policy.service.interface';
import { IPolicyRepository } from './policy.repository.interface';
import { LeavePolicy, ValidationResult, AppError } from '../../shared/types';

export class PolicyService implements IPolicyService {
  constructor(private readonly policyRepository: IPolicyRepository) {}

  async getPolicy(leaveTypeId: string): Promise<LeavePolicy | null> {
    try {
      return await this.policyRepository.findByLeaveTypeId(leaveTypeId);
    } catch (error) {
      throw new AppError(`Failed to get policy: ${(error as Error).message}`, 500);
    }
  }

  async getPolicies(): Promise<LeavePolicy[]> {
    try {
      return await this.policyRepository.findAll();
    } catch (error) {
      throw new AppError(`Failed to get policies: ${(error as Error).message}`, 500);
    }
  }

  async createPolicy(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    try {
      return await this.policyRepository.create(policy);
    } catch (error) {
      throw new AppError(`Failed to create policy: ${(error as Error).message}`, 500);
    }
  }

  async updatePolicy(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy> {
    try {
      return await this.policyRepository.update(id, updates);
    } catch (error) {
      throw new AppError(`Failed to update policy: ${(error as Error).message}`, 500);
    }
  }

  async deletePolicy(id: string): Promise<void> {
    try {
      await this.policyRepository.delete(id);
    } catch (error) {
      throw new AppError(`Failed to delete policy: ${(error as Error).message}`, 500);
    }
  }

  async validateRequest(employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date): Promise<ValidationResult> {
    try {
      const policy = await this.policyRepository.findByLeaveTypeId(leaveTypeId);
      if (!policy) {
        return { isValid: false, errors: ['Leave type not found'] };
      }
      
      const errors: string[] = [];
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (days > policy.maxDays) {
        errors.push(`Exceeds maximum days of ${policy.maxDays}`);
      }
      
      return { isValid: errors.length === 0, errors };
    } catch (error) {
      throw new AppError(`Failed to validate request: ${(error as Error).message}`, 500);
    }
  }
}
