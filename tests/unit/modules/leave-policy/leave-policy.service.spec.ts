import { LeavePolicyService, ILeavePolicyService } from 'modules/leave-policy';
import { ILeavePolicyRepository } from 'modules/leave-policy';
import { LeavePolicy } from 'modules/leave-policy';
import { LeaveType } from 'shared/types';

function createMockLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: 40,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('LeavePolicyService', () => {
  let leavePolicyService: ILeavePolicyService;
  let mockRepository: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
    };

    leavePolicyService = new LeavePolicyService(mockRepository);
  });

  describe('getById', () => {
    it('should return a leave policy when found', async () => {
      const policy = createMockLeavePolicy();
      mockRepository.findById.mockResolvedValue(policy);

      const result = await leavePolicyService.getById('lp-1');
      expect(result).toEqual(policy);
      expect(mockRepository.findById).toHaveBeenCalledWith('lp-1');
    });

    it('should return null when policy not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await leavePolicyService.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getByLeaveType', () => {
    it('should return a leave policy when found', async () => {
      const policy = createMockLeavePolicy({ leaveType: LeaveType.SICK });
      mockRepository.findByLeaveType.mockResolvedValue(policy);

      const result = await leavePolicyService.getByLeaveType(LeaveType.SICK);
      expect(result).toEqual(policy);
      expect(mockRepository.findByLeaveType).toHaveBeenCalledWith(LeaveType.SICK);
    });

    it('should return null when policy not found', async () => {
      mockRepository.findByLeaveType.mockResolvedValue(null);

      const result = await leavePolicyService.getByLeaveType(LeaveType.UNPAID);
      expect(result).toBeNull();
    });
  });

  describe('getActivePolicies', () => {
    it('should return all active policies', async () => {
      const policies = [
        createMockLeavePolicy({ id: 'lp-1', leaveType: LeaveType.ANNUAL }),
        createMockLeavePolicy({ id: 'lp-2', leaveType: LeaveType.SICK, policyName: 'Sick Leave' }),
      ];
      mockRepository.findActive.mockResolvedValue(policies);

      const result = await leavePolicyService.getActivePolicies();
      expect(result).toEqual(policies);
      expect(mockRepository.findActive).toHaveBeenCalled();
    });

    it('should return empty array when no active policies', async () => {
      mockRepository.findActive.mockResolvedValue([]);

      const result = await leavePolicyService.getActivePolicies();
      expect(result).toEqual([]);
    });
  });

  describe('isLeaveTypeActive', () => {
    it('should return true when policy exists and is active', async () => {
      const policy = createMockLeavePolicy({ isActive: true });
      mockRepository.findByLeaveType.mockResolvedValue(policy);

      const result = await leavePolicyService.isLeaveTypeActive(LeaveType.ANNUAL);
      expect(result).toBe(true);
    });

    it('should return false when policy exists but is inactive', async () => {
      const policy = createMockLeavePolicy({ isActive: false });
      mockRepository.findByLeaveType.mockResolvedValue(policy);

      const result = await leavePolicyService.isLeaveTypeActive(LeaveType.ANNUAL);
      expect(result).toBe(false);
    });

    it('should return false when policy does not exist', async () => {
      mockRepository.findByLeaveType.mockResolvedValue(null);

      const result = await leavePolicyService.isLeaveTypeActive(LeaveType.EMERGENCY);
      expect(result).toBe(false);
    });
  });
});
