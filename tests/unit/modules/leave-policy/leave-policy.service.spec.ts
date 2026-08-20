import { LeavePolicyService } from '../../../../src/modules/leave-policy/leave-policy.service';
import { ILeavePolicyRepository, LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave Policy',
    leaveType: LeaveType.annual,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<ILeavePolicyRepository> {
  return {
    findById: jest.fn(),
    findByLeaveType: jest.fn(),
    findAllActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

describe('LeavePolicyService', () => {
  let service: LeavePolicyService;
  let mockRepo: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new LeavePolicyService(mockRepo);
  });

  describe('getPolicyForLeaveType', () => {
    it('should delegate to repository.findByLeaveType with the given leaveType', async () => {
      const policy = makePolicy();
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.getPolicyForLeaveType(LeaveType.annual);

      expect(result).toEqual(policy);
      expect(mockRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.annual);
    });

    it('should return null when repository returns null', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce(null);

      const result = await service.getPolicyForLeaveType(LeaveType.emergency);

      expect(result).toBeNull();
    });

    it('should never throw', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce(null);

      await expect(
        service.getPolicyForLeaveType(LeaveType.annual),
      ).resolves.toBeNull();
    });
  });

  describe('validateEntitlement', () => {
    it('should return true when requestedDays <= entitlementDays', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement(
        'emp-1',
        LeaveType.annual,
        10,
      );

      expect(result).toBe(true);
    });

    it('should return true when requestedDays equals entitlementDays exactly', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement(
        'emp-1',
        LeaveType.annual,
        20,
      );

      expect(result).toBe(true);
    });

    it('should return false when requestedDays > entitlementDays', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement(
        'emp-1',
        LeaveType.annual,
        25,
      );

      expect(result).toBe(false);
    });

    it('should return false when no policy exists for the given leaveType', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce(null);

      const result = await service.validateEntitlement(
        'emp-1',
        LeaveType.emergency,
        5,
      );

      expect(result).toBe(false);
    });

    it('should return true when requestedDays is 0 and policy exists', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement(
        'emp-1',
        LeaveType.annual,
        0,
      );

      expect(result).toBe(true);
    });
  });
});
