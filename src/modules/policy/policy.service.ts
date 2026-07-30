import { ILeavePolicyRepository } from './policy.repository.interface';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/index';

export class PolicyService {
  constructor(private readonly repository: ILeavePolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy | null> {
    try {
      return await this.repository.findById(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PolicyService.getById failed: ${message}`);
    }
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    try {
      return await this.repository.findByLeaveType(leaveType);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PolicyService.getByLeaveType failed: ${message}`);
    }
  }

  async getAllActive(): Promise<LeavePolicy[]> {
    try {
      return await this.repository.findAllActive();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PolicyService.getAllActive failed: ${message}`);
    }
  }

  async createPolicy(
    data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy> {
    try {
      return await this.repository.create(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PolicyService.createPolicy failed: ${message}`);
    }
  }

  async updatePolicy(
    id: string,
    data: Partial<LeavePolicy>
  ): Promise<LeavePolicy | null> {
    try {
      return await this.repository.update(id, data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PolicyService.updatePolicy failed: ${message}`);
    }
  }
}
