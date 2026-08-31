import { PoolClient } from 'pg';
import {
  CreateLeavePolicyInput,
  LeavePolicy,
  PolicyService,
  PgLeavePolicyRepository,
  InvalidLeaveTypeError,
  InvalidEntitlementDaysError,
} from '../../../../src/modules/policy';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.model';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';
import { LeaveType } from '../../../../src/shared/types';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: undefined,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createInput(overrides: Partial<CreateLeavePolicyInput> = {}): CreateLeavePolicyInput {
  const policy = makePolicy();
  return {
    policyName: policy.policyName,
    leaveType: policy.leaveType,
    entitlementDays: policy.entitlementDays,
    accrualRate: policy.accrualRate,
    maxAccumulation: policy.maxAccumulation,
    minimumNoticeDays: policy.minimumNoticeDays,
    requiresManagerApproval: policy.requiresManagerApproval,
    isActive: policy.isActive,
    ...overrides,
  };
}

describe('PolicyService', () => {
  let policies: jest.Mocked<ILeavePolicyRepository>;
  let uow: jest.Mocked<IUnitOfWork>;
  let service: PolicyService;
  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    policies = {
      create: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActiveByLeaveType: jest.fn(),
      update: jest.fn(),
    };
    uow = {
      withTransaction: jest.fn(),
    };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new PolicyService(
      policies as unknown as PgLeavePolicyRepository,
      uow,
    );
  });

  it('create throws InvalidLeaveTypeError on unknown value', async () => {
    const input = createInput({ leaveType: 'unknown' as unknown as LeaveType });

    await expect(service.create(input)).rejects.toThrow(InvalidLeaveTypeError);
    expect(policies.create).not.toHaveBeenCalled();
  });

  it('create throws InvalidEntitlementDaysError on negative value', async () => {
    const input = createInput({ entitlementDays: -1 });

    await expect(service.create(input)).rejects.toThrow(
      InvalidEntitlementDaysError,
    );
  });

  it('create throws InvalidEntitlementDaysError on non-integer value', async () => {
    const input = createInput({ entitlementDays: 2.5 });

    await expect(service.create(input)).rejects.toThrow(
      InvalidEntitlementDaysError,
    );
  });

  it('create assigns id/createdAt/updatedAt and delegates to repo.create', async () => {
    const input = createInput();
    policies.create.mockResolvedValue(makePolicy());

    const result = await service.create(input);

    expect(policies.create).toHaveBeenCalledTimes(1);
    const calledWith = policies.create.mock.calls[0][0];
    expect(typeof calledWith.id).toBe('string');
    expect(calledWith.id.length).toBeGreaterThan(0);
    expect(calledWith.createdAt).toBeInstanceOf(Date);
    expect(calledWith.updatedAt).toBeInstanceOf(Date);
    expect(calledWith.policyName).toBe(input.policyName);
    expect(calledWith.leaveType).toBe(input.leaveType);
    expect(calledWith.entitlementDays).toBe(input.entitlementDays);
    expect(result).toBeDefined();
  });

  it('list delegates to repo.list', async () => {
    const policy = makePolicy();
    policies.list.mockResolvedValue([policy]);

    const result = await service.list();

    expect(policies.list).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([policy]);
  });

  it('findById delegates to repo.findById', async () => {
    const policy = makePolicy();
    policies.findById.mockResolvedValue(policy);

    const result = await service.findById('pol-1');

    expect(policies.findById).toHaveBeenCalledWith('pol-1', undefined);
    expect(result).toEqual(policy);
  });

  it('update with a supplied client delegates directly', async () => {
    const changes = { policyName: 'Annual Leave v2' };
    const updated = makePolicy({ policyName: 'Annual Leave v2' });
    policies.update.mockResolvedValue(updated);

    const result = await service.update('pol-1', changes, fakeClient);

    expect(policies.update).toHaveBeenCalledWith('pol-1', changes, fakeClient);
    expect(uow.withTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it('findByLeaveType delegates to repo.findByLeaveType', async () => {
    const policy = makePolicy();
    policies.findByLeaveType.mockResolvedValue(policy);

    const result = await service.findByLeaveType(LeaveType.ANNUAL);

    expect(policies.findByLeaveType).toHaveBeenCalledWith(
      LeaveType.ANNUAL,
      undefined,
    );
    expect(result).toEqual(policy);
  });
});
