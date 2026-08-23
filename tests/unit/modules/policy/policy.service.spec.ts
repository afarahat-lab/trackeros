import { PolicyService } from 'modules/policy/policy.service';
import {
  LeavePolicy,
  IPolicyRepository,
  PolicyNotFoundError,
  DuplicateLeaveTypeError,
} from 'modules/policy/policy.model';
import { LeaveType } from 'shared/types/leave.types';

function makeMockPolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<IPolicyRepository> {
  return {
    findById: jest.fn(),
    findByLeaveType: jest.fn(),
    findAllActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

describe('PolicyService', () => {
  let service: PolicyService;
  let repo: jest.Mocked<IPolicyRepository>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new PolicyService(repo);
  });

  describe('getById', () => {
    it('returns policy when found', async () => {
      const policy = makeMockPolicy();
      repo.findById.mockResolvedValue(policy);

      const result = await service.getById('pol-1');
      expect(result).toEqual(policy);
    });

    it('throws PolicyNotFoundError when not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(
        PolicyNotFoundError
      );
      await expect(service.getById('nonexistent')).rejects.toThrow(
        'Policy not found: id: nonexistent'
      );
    });
  });

  describe('getByLeaveType', () => {
    it('returns policy when found', async () => {
      const policy = makeMockPolicy({ leaveType: LeaveType.SICK });
      repo.findByLeaveType.mockResolvedValue(policy);

      const result = await service.getByLeaveType(LeaveType.SICK);
      expect(result).toEqual(policy);
    });

    it('throws PolicyNotFoundError when not found', async () => {
      repo.findByLeaveType.mockResolvedValue(null);

      await expect(
        service.getByLeaveType(LeaveType.EMERGENCY)
      ).rejects.toThrow(PolicyNotFoundError);
    });
  });

  describe('getAllActive', () => {
    it('returns all active policies', async () => {
      const policies = [
        makeMockPolicy({ id: 'pol-1', leaveType: LeaveType.ANNUAL }),
        makeMockPolicy({ id: 'pol-2', leaveType: LeaveType.SICK, policyName: 'Sick Leave' }),
      ];
      repo.findAllActive.mockResolvedValue(policies);

      const result = await service.getAllActive();
      expect(result).toEqual(policies);
    });

    it('returns empty array when no active policies', async () => {
      repo.findAllActive.mockResolvedValue([]);

      const result = await service.getAllActive();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates and returns a new policy', async () => {
      const input = {
        policyName: 'Emergency Leave',
        leaveType: LeaveType.EMERGENCY,
        entitlementDays: 5,
        accrualRate: undefined,
        maxAccumulation: undefined,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
      };
      const created = makeMockPolicy({
        id: 'pol-new',
        ...input,
      });
      repo.create.mockResolvedValue(created);

      const result = await service.create(input);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith(input);
    });

    it('rejects zero entitlementDays', async () => {
      const input = {
        policyName: 'Zero Days',
        leaveType: LeaveType.EMERGENCY,
        entitlementDays: 0,
        accrualRate: undefined,
        maxAccumulation: undefined,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
      };

      await expect(service.create(input)).rejects.toThrow(
        'entitlementDays must be greater than 0'
      );
    });

    it('rejects negative entitlementDays', async () => {
      const input = {
        policyName: 'Negative Days',
        leaveType: LeaveType.EMERGENCY,
        entitlementDays: -1,
        accrualRate: undefined,
        maxAccumulation: undefined,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
      };

      await expect(service.create(input)).rejects.toThrow(
        'entitlementDays must be greater than 0'
      );
    });

    it('propagates DuplicateLeaveTypeError from repository', async () => {
      repo.create.mockRejectedValue(
        new DuplicateLeaveTypeError(LeaveType.ANNUAL)
      );

      await expect(
        service.create({
          policyName: 'Annual Leave',
          leaveType: LeaveType.ANNUAL,
          entitlementDays: 20,
          accrualRate: undefined,
          maxAccumulation: undefined,
          minimumNoticeDays: 7,
          requiresManagerApproval: true,
          isActive: true,
        })
      ).rejects.toThrow(DuplicateLeaveTypeError);
    });
  });

  describe('update', () => {
    it('updates and returns policy', async () => {
      const existing = makeMockPolicy();
      const updated = makeMockPolicy({ entitlementDays: 25 });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('pol-1', { entitlementDays: 25 });
      expect(result).toEqual(updated);
    });

    it('throws PolicyNotFoundError when policy does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { entitlementDays: 25 })
      ).rejects.toThrow(PolicyNotFoundError);
    });

    it('rejects zero entitlementDays on update', async () => {
      await expect(
        service.update('pol-1', { entitlementDays: 0 })
      ).rejects.toThrow('entitlementDays must be greater than 0');
    });

    it('rejects negative entitlementDays on update', async () => {
      await expect(
        service.update('pol-1', { entitlementDays: -5 })
      ).rejects.toThrow('entitlementDays must be greater than 0');
    });

    it('allows update without entitlementDays', async () => {
      const existing = makeMockPolicy();
      const updated = makeMockPolicy({ policyName: 'Updated Name' });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('pol-1', { policyName: 'Updated Name' });
      expect(result.policyName).toBe('Updated Name');
    });
  });

  describe('getEntitlementForType', () => {
    it('returns entitlementDays for active policy', async () => {
      const policy = makeMockPolicy({
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        isActive: true,
      });
      repo.findByLeaveType.mockResolvedValue(policy);

      const result = await service.getEntitlementForType(LeaveType.SICK);
      expect(result).toBe(10);
    });

    it('throws PolicyNotFoundError when no policy exists for type', async () => {
      repo.findByLeaveType.mockResolvedValue(null);

      await expect(
        service.getEntitlementForType(LeaveType.EMERGENCY)
      ).rejects.toThrow(PolicyNotFoundError);
      await expect(
        service.getEntitlementForType(LeaveType.EMERGENCY)
      ).rejects.toThrow('Policy not found: leaveType: emergency');
    });

    it('throws PolicyNotFoundError when policy exists but is inactive', async () => {
      const policy = makeMockPolicy({
        leaveType: LeaveType.ANNUAL,
        isActive: false,
      });
      repo.findByLeaveType.mockResolvedValue(policy);

      await expect(
        service.getEntitlementForType(LeaveType.ANNUAL)
      ).rejects.toThrow(PolicyNotFoundError);
    });
  });
});
