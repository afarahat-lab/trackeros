import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

import { NotFoundError, ValidationError } from '../../shared/types/errors';
import {
  CreateLeavePolicyInput,
  ILeavePolicyRepository,
  IPolicyService,
  LeavePolicy,
  UpdateLeavePolicyInput
} from './policy.model';
import { PgLeavePolicyRepository } from './policy.repository';

export class PolicyService implements IPolicyService {
  private readonly repository: ILeavePolicyRepository;

  constructor(repository: ILeavePolicyRepository = new PgLeavePolicyRepository()) {
    this.repository = repository;
  }

  async create(
    input: CreateLeavePolicyInput,
    client?: PoolClient
  ): Promise<LeavePolicy> {
    if (!input.policyName || !input.leaveTypeId) {
      throw new ValidationError('policyName and leaveTypeId are required');
    }
    if (input.entitlementDays < 0) {
      throw new ValidationError('entitlementDays must be non-negative');
    }
    const now = new Date();
    const policy: LeavePolicy = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    return this.repository.create(policy, client);
  }

  async update(
    id: string,
    input: UpdateLeavePolicyInput,
    client?: PoolClient
  ): Promise<LeavePolicy> {
    const current = await this.repository.findById(id, client);
    if (!current) {
      throw new NotFoundError(`Policy ${id} not found`);
    }
    if (input.entitlementDays !== undefined && input.entitlementDays < 0) {
      throw new ValidationError('entitlementDays must be non-negative');
    }
    const merged: LeavePolicy = {
      ...current,
      ...input,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date()
    };
    return this.repository.update(merged, client);
  }

  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    return this.repository.findById(id, client);
  }

  async deactivate(id: string, client?: PoolClient): Promise<LeavePolicy> {
    const current = await this.repository.findById(id, client);
    if (!current) {
      throw new NotFoundError(`Policy ${id} not found`);
    }
    const merged: LeavePolicy = {
      ...current,
      isActive: false,
      updatedAt: new Date()
    };
    return this.repository.update(merged, client);
  }
}
