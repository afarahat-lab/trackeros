import { PolicyService } from '../../../../src/modules/policy/policy.service';
import { IPolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { LeaveType } from '../../../../src/shared/types/leave-type.enum';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: 20,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PolicyService', () => {
  let mockRepository: jest.Mocked<IPolicyRepository>;
  let service: PolicyService;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new PolicyService(mockRepository);
  });

  describe('getById', () => {
    it('should return policy when found', async () => {
      const policy = makePolicy();
      mockRepository.findById.mockResolvedValueOnce(policy);

      const result = await service.getById('pol-1');

      expect(result).toEqual(policy);
      expect(mockRepository.findById).toHaveBeenCalledWith('pol-1');
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByLeaveType', () => {
    it('should return policy when found for leave type', async () => {
      const policy = makePolicy({ leaveType: LeaveType.SICK });
      mockRepository.findByLeaveType.mockResolvedValueOnce(policy);

      const result = await service.getByLeaveType(LeaveType.SICK);

      expect(result).toEqual(policy);
      expect(mockRepository.findByLeaveType).toHaveBeenCalledWith(LeaveType.SICK);
    });

    it('should return null when no policy for leave type', async () => {
      mockRepository.findByLeaveType.mockResolvedValueOnce(null);

      const result = await service.getByLeaveType(LeaveType.UNPAID);

      expect(result).toBeNull();
    });
  });

  describe('getAllActive', () => {
    it('should return all active policies', async () => {
      const policies = [
        makePolicy(),
        makePolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: LeaveType.SICK }),
      ];
      mockRepository.findAllActive.mockResolvedValueOnce(policies);

      const result = await service.getAllActive();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pol-1');
      expect(result[1].id).toBe('pol-2');
      expect(mockRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no active policies', async () => {
      mockRepository.findAllActive.mockResolvedValueOnce([]);

      const result = await service.getAllActive();

      expect(result).toEqual([]);
    });
  });
});
