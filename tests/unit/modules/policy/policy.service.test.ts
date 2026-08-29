jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PolicyService } from '../../../../src/modules/policy/policy.service';
import {
  CreateLeavePolicyInput,
  ILeavePolicyRepository,
  LeavePolicy
} from '../../../../src/modules/policy/policy.model';
import {
  NotFoundError,
  ValidationError
} from '../../../../src/shared/types/errors';

function makeInput(overrides: Partial<CreateLeavePolicyInput> = {}): CreateLeavePolicyInput {
  return {
    policyName: 'Annual Leave',
    leaveTypeId: 'lt-1',
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 5,
    requiresManagerApproval: true,
    isActive: true,
    ...overrides
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveTypeId: 'lt-1',
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 5,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('PolicyService', () => {
  let repository: jest.Mocked<ILeavePolicyRepository>;
  let service: PolicyService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByLeaveTypeId: jest.fn(),
      findActive: jest.fn()
    };
    service = new PolicyService(repository);
  });

  describe('create', () => {
    it('throws ValidationError when policyName is missing', async () => {
      await expect(
        service.create(makeInput({ policyName: '' }))
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when leaveTypeId is missing', async () => {
      await expect(
        service.create(makeInput({ leaveTypeId: '' }))
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for negative entitlementDays', async () => {
      await expect(
        service.create(makeInput({ entitlementDays: -1 }))
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('creates with generated id and createdAt/updatedAt set to now', async () => {
      repository.create.mockImplementation(async (p) => p);

      const result = await service.create(makeInput());

      expect(result.id).toHaveLength(36);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt).toEqual(result.updatedAt);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ policyName: 'Annual Leave' }),
        undefined
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundError when the policy is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { entitlementDays: 10 })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ValidationError for a negative entitlement update', async () => {
      repository.findById.mockResolvedValue(makePolicy());

      await expect(
        service.update('pol-1', { entitlementDays: -5 })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('merges the update and bumps updatedAt', async () => {
      repository.findById.mockResolvedValue(makePolicy());
      repository.update.mockImplementation(async (p) => p);

      const result = await service.update('pol-1', { entitlementDays: 25 });

      expect(result.entitlementDays).toBe(25);
      expect(result.createdAt).toEqual(makePolicy().createdAt);
      expect(result.updatedAt).not.toEqual(makePolicy().updatedAt);
    });
  });

  describe('deactivate', () => {
    it('sets isActive=false without deleting', async () => {
      repository.findById.mockResolvedValue(makePolicy());
      repository.update.mockImplementation(async (p) => p);

      const result = await service.deactivate('pol-1');

      expect(result.isActive).toBe(false);
      expect(repository.update).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundError when the policy is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deactivate('missing')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });
});
