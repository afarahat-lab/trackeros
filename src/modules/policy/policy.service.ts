import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { LeaveType } from '../../shared/types';
import { LeavePolicy } from './policy.model';
import { PgLeavePolicyRepository } from './policy.repository';
import {
  CreateLeavePolicyInput,
  IPolicyService,
} from './policy.service.interface';

export class InvalidLeaveTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLeaveTypeError';
  }
}

export class PolicyService implements IPolicyService {
  constructor(
    private readonly policies: PgLeavePolicyRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(input: CreateLeavePolicyInput): Promise<LeavePolicy> {
    if (!Object.values(LeaveType).includes(input.leaveType)) {
      throw new InvalidLeaveTypeError(
        `Invalid leave type: ${String(input.leaveType)}`,
      );
    }
    const now = new Date();
    const policy: LeavePolicy = {
      id: randomUUID(),
      policyName: input.policyName,
      leaveType: input.leaveType,
      entitlementDays: input.entitlementDays,
      accrualRate: input.accrualRate,
      maxAccumulation: input.maxAccumulation,
      minimumNoticeDays: input.minimumNoticeDays,
      requiresManagerApproval: input.requiresManagerApproval,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    };
    return this.policies.create(policy);
  }

  async update(
    id: string,
    changes: Partial<LeavePolicy>,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    return this.uow.withTransaction((tx) =>
      this.policies.update(id, changes, client ?? tx),
    );
  }

  async activate(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    return this.uow.withTransaction(async (tx) => {
      const db = client ?? tx;
      const policy = await this.policies.findById(id, db);
      if (!policy) {
        return null;
      }
      return this.policies.update(id, { isActive: true }, db);
    });
  }

  async deactivate(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    return this.uow.withTransaction(async (tx) => {
      const db = client ?? tx;
      const policy = await this.policies.findById(id, db);
      if (!policy) {
        return null;
      }
      return this.policies.update(id, { isActive: false }, db);
    });
  }

  async findByLeaveType(
    leaveType: LeaveType,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    return this.policies.findByLeaveType(leaveType, client);
  }
}
