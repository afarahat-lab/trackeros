import { LeaveType } from '../../../../src/shared/types';
import { LeavePolicyService } from '../../../../src/modules/policy/policy.service';
import type { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import type {
  LeavePolicy,
  CreateLeavePolicyInput,
} from '../../../../src/modules/policy/policy.model';

describe('LeavePolicyService', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  function makePolicy(id: string, overrides: Partial<LeavePolicy> = {}): LeavePolicy {
    return {
      id,
      policyName: 'Annual Leave',
      leaveType: LeaveType.annual,
      entitlementDays: 20,
      accrualRate: undefined,
      maxAccumulation: undefined,
      minimumNoticeDays: undefined,
      requiresManagerApproval: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  it('delegates create to the injected repository', async () => {
    const policy = makePolicy('pol-1');
    const repository: ILeavePolicyRepository = {
      create: jest.fn().mockResolvedValue(policy),
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      update: jest.fn(),
    };
    const service = new LeavePolicyService(repository);

    const input: CreateLeavePolicyInput = {
      policyName: 'Annual Leave',
      leaveType: LeaveType.annual,
      entitlementDays: 20,
    };

    await expect(service.create(input)).resolves.toBe(policy);
    expect(repository.create).toHaveBeenCalledWith(input, undefined);
  });

  it('delegates findById to the injected repository', async () => {
    const policy = makePolicy('pol-1');
    const repository: ILeavePolicyRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(policy),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      update: jest.fn(),
    };
    const service = new LeavePolicyService(repository);

    await expect(service.findById('pol-1')).resolves.toBe(policy);
    expect(repository.findById).toHaveBeenCalledWith('pol-1');
  });

  it('delegates findByLeaveType to the injected repository', async () => {
    const policies = [makePolicy('pol-1')];
    const repository: ILeavePolicyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByLeaveType: jest.fn().mockResolvedValue(policies),
      findActive: jest.fn(),
      update: jest.fn(),
    };
    const service = new LeavePolicyService(repository);

    await expect(service.findByLeaveType(LeaveType.annual)).resolves.toBe(policies);
    expect(repository.findByLeaveType).toHaveBeenCalledWith(LeaveType.annual);
  });

  it('delegates findActive to the injected repository', async () => {
    const policies = [makePolicy('pol-1')];
    const repository: ILeavePolicyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn().mockResolvedValue(policies),
      update: jest.fn(),
    };
    const service = new LeavePolicyService(repository);

    await expect(service.findActive()).resolves.toBe(policies);
    expect(repository.findActive).toHaveBeenCalled();
  });

  it('delegates update to the injected repository', async () => {
    const policy = makePolicy('pol-1', { isActive: false });
    const repository: ILeavePolicyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      update: jest.fn().mockResolvedValue(policy),
    };
    const service = new LeavePolicyService(repository);

    await expect(service.update('pol-1', { isActive: false })).resolves.toBe(policy);
    expect(repository.update).toHaveBeenCalledWith('pol-1', { isActive: false }, undefined);
  });
});
