import { LeavePolicyService } from '../../../../src/modules/leave-policy/leave-policy.service';
import { ILeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types/leave.types';

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
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
    };
    service = new LeavePolicyService(mockRepo);
  });

  describe('findByLeaveType', () => {
    it('returns policies matching the given leave type', async () => {
      const policies = [
        makeLeavePolicy(),
        makeLeavePolicy({ id: 'pol-002', policyName: 'Annual Leave (Exec)' }),
      ];
      mockRepo.findByLeaveType.mockResolvedValueOnce(policies);

      const result = await service.findByLeaveType(LeaveType.ANNUAL);

      expect(mockRepo.findByLeaveType).toHaveBeenCalledWith(LeaveType.ANNUAL);
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when no policies match', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.findByLeaveType(LeaveType.SICK);

      expect(result).toEqual([]);
    });

    it('returns policies regardless of active state', async () => {
      const policies = [
        makeLeavePolicy({ isActive: true }),
        makeLeavePolicy({ id: 'pol-002', isActive: false }),
      ];
      mockRepo.findByLeaveType.mockResolvedValueOnce(policies);

      const result = await service.findByLeaveType(LeaveType.ANNUAL);

      expect(result).toHaveLength(2);
    });
  });

  describe('getEntitlement', () => {
    it('returns entitlementDays of the active policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([makeLeavePolicy({ entitlementDays: 20 })]);

      const result = await service.getEntitlement(LeaveType.ANNUAL);

      expect(result).toBe(20);
    });

    it('returns null when no policies exist for the leave type', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.getEntitlement(LeaveType.SICK);

      expect(result).toBeNull();
    });

    it('returns null when policies exist but none are active', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ isActive: false, entitlementDays: 20 }),
      ]);

      const result = await service.getEntitlement(LeaveType.ANNUAL);

      expect(result).toBeNull();
    });

    it('uses the first active policy when multiple exist', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ id: 'pol-001', isActive: true, entitlementDays: 15 }),
        makeLeavePolicy({ id: 'pol-002', isActive: true, entitlementDays: 20 }),
      ]);

      const result = await service.getEntitlement(LeaveType.ANNUAL);

      expect(result).toBe(15);
    });

    it('does not throw on missing policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      await expect(service.getEntitlement(LeaveType.ANNUAL)).resolves.toBeNull();
    });
  });

  describe('requiresManagerApproval', () => {
    it('returns true when active policy requires manager approval', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ requiresManagerApproval: true }),
      ]);

      const result = await service.requiresManagerApproval(LeaveType.ANNUAL);

      expect(result).toBe(true);
    });

    it('returns false when active policy does not require manager approval', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ requiresManagerApproval: false }),
      ]);

      const result = await service.requiresManagerApproval(LeaveType.SICK);

      expect(result).toBe(false);
    });

    it('returns null when no policies exist for the leave type', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.requiresManagerApproval(LeaveType.EMERGENCY);

      expect(result).toBeNull();
    });

    it('returns null when policies exist but none are active', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ isActive: false, requiresManagerApproval: true }),
      ]);

      const result = await service.requiresManagerApproval(LeaveType.ANNUAL);

      expect(result).toBeNull();
    });

    it('does not throw on missing policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      await expect(service.requiresManagerApproval(LeaveType.ANNUAL)).resolves.toBeNull();
    });
  });

  describe('getMinimumNoticeDays', () => {
    it('returns minimumNoticeDays of the active policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ minimumNoticeDays: 7 }),
      ]);

      const result = await service.getMinimumNoticeDays(LeaveType.ANNUAL);

      expect(result).toBe(7);
    });

    it('preserves null minimumNoticeDays from the active policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ minimumNoticeDays: null }),
      ]);

      const result = await service.getMinimumNoticeDays(LeaveType.EMERGENCY);

      expect(result).toBeNull();
    });

    it('returns null when no policies exist for the leave type', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      const result = await service.getMinimumNoticeDays(LeaveType.SICK);

      expect(result).toBeNull();
    });

    it('returns null when policies exist but none are active', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([
        makeLeavePolicy({ isActive: false, minimumNoticeDays: 7 }),
      ]);

      const result = await service.getMinimumNoticeDays(LeaveType.ANNUAL);

      expect(result).toBeNull();
    });

    it('does not throw on missing policy', async () => {
      mockRepo.findByLeaveType.mockResolvedValueOnce([]);

      await expect(service.getMinimumNoticeDays(LeaveType.ANNUAL)).resolves.toBeNull();
    });
  });
});
