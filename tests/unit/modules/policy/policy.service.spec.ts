import { PolicyService } from 'modules/policy/policy.service';
import { IPolicyRepository } from 'modules/policy/policy.repository.interface';
import { LeavePolicy } from 'modules/policy/policy.model';

const makeLeavePolicy = (overrides: Partial<LeavePolicy> = {}): LeavePolicy => ({
  id: 'pol-1',
  policyName: 'Annual Leave',
  leaveType: 'annual',
  entitlementDays: 20,
  accrualRate: undefined,
  maxAccumulation: undefined,
  minimumNoticeDays: 7,
  requiresManagerApproval: true,
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

describe('PolicyService', () => {
  let service: PolicyService;
  let mockRepo: jest.Mocked<IPolicyRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      findActiveByLeaveType: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new PolicyService(mockRepo);
  });

  describe('getById', () => {
    it('should return policy when found', async () => {
      const policy = makeLeavePolicy();
      mockRepo.findById.mockResolvedValue(policy);
      await expect(service.getById('pol-1')).resolves.toEqual(policy);
      expect(mockRepo.findById).toHaveBeenCalledWith('pol-1');
    });

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getById('nonexistent')).resolves.toBeNull();
    });
  });

  describe('getByLeaveType', () => {
    it('should return active policy for leave type', async () => {
      const policy = makeLeavePolicy();
      mockRepo.findActiveByLeaveType.mockResolvedValue(policy);
      await expect(service.getByLeaveType('annual')).resolves.toEqual(policy);
      expect(mockRepo.findActiveByLeaveType).toHaveBeenCalledWith('annual');
    });

    it('should return null when no active policy exists', async () => {
      mockRepo.findActiveByLeaveType.mockResolvedValue(null);
      await expect(service.getByLeaveType('annual')).resolves.toBeNull();
    });
  });

  describe('getAllActive', () => {
    it('should return all active policies', async () => {
      const policies = [
        makeLeavePolicy({ id: 'pol-1' }),
        makeLeavePolicy({ id: 'pol-2', leaveType: 'sick' }),
      ];
      mockRepo.findActive.mockResolvedValue(policies);
      await expect(service.getAllActive()).resolves.toEqual(policies);
      expect(mockRepo.findActive).toHaveBeenCalled();
    });

    it('should return empty array when none', async () => {
      mockRepo.findActive.mockResolvedValue([]);
      await expect(service.getAllActive()).resolves.toEqual([]);
    });
  });

  describe('validatePolicyExists', () => {
    it('should return policy when found and active', async () => {
      const policy = makeLeavePolicy();
      mockRepo.findById.mockResolvedValue(policy);
      await expect(service.validatePolicyExists('pol-1')).resolves.toEqual(policy);
    });

    it('should throw with "not found" message when policy does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.validatePolicyExists('nonexistent')).rejects.toThrow(
        'Policy not found: nonexistent',
      );
    });

    it('should throw with "inactive" message when policy exists but isActive is false', async () => {
      const policy = makeLeavePolicy({ isActive: false });
      mockRepo.findById.mockResolvedValue(policy);
      await expect(service.validatePolicyExists('pol-1')).rejects.toThrow(
        'Policy is inactive: pol-1',
      );
    });
  });
});
