import { LeavePolicyService } from '../../../../src/modules/leave-policy/leave-policy.service';
import { ILeavePolicyRepository, LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.annual,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeavePolicyService', () => {
  let service: LeavePolicyService;
  let mockRepo: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new LeavePolicyService(mockRepo);
  });

  describe('getPolicyForLeaveType', () => {
    it('should delegate to repository.findByLeaveType', async () => {
      const policy = makePolicy();
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.getPolicyForLeaveType(LeaveType.annual);

      expect(mockRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.annual);
      expect(result).toEqual(policy);
    });

    it('should return null when no policy exists', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce(null);

      const result = await service.getPolicyForLeaveType(LeaveType.sick);

      expect(result).toBeNull();
    });
  });

  describe('validateEntitlement', () => {
    it('should return true when requestedDays <= entitlementDays', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement('emp-1', LeaveType.annual, 15);

      expect(mockRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.annual);
      expect(result).toBe(true);
    });

    it('should return true when requestedDays equals entitlementDays', async () => {
      const policy = makePolicy({ entitlementDays: 20 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement('emp-1', LeaveType.annual, 20);

      expect(result).toBe(true);
    });

    it('should return false when requestedDays > entitlementDays', async () => {
      const policy = makePolicy({ entitlementDays: 10 });
      mockRepo.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.validateEntitlement('emp-1', LeaveType.annual, 15);

      expect(result).toBe(false);
    });

    it('should return false when no policy exists for the leave type', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce(null);

      const result = await service.validateEntitlement('emp-1', LeaveType.emergency, 5);

      expect(result).toBe(false);
    });
  });
});
