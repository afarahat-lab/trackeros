import { LeavePolicyService } from '../../../../src/modules/leave-policy/leave-policy.service';
import { ILeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-1',
    policyName: 'Annual Leave Policy',
    leaveTypeId: 'lt-annual',
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
      findByLeaveTypeId: jest.fn(),
      findActiveByLeaveTypeId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new LeavePolicyService(mockRepo);
  });

  describe('getActivePolicy', () => {
    it('should return the active policy for a leave type', async () => {
      const policy = makePolicy({ isActive: true });
      mockRepo.findActiveByLeaveTypeId.mockResolvedValueOnce(policy);

      const result = await service.getActivePolicy('lt-annual');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(result!.isActive).toBe(true);
      expect(mockRepo.findActiveByLeaveTypeId).toHaveBeenCalledWith('lt-annual');
    });

    it('should return null when no active policy exists', async () => {
      mockRepo.findActiveByLeaveTypeId.mockResolvedValueOnce(null);

      const result = await service.getActivePolicy('lt-annual');

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      const dbError = new Error('connection refused');
      mockRepo.findActiveByLeaveTypeId.mockRejectedValueOnce(dbError);

      await expect(service.getActivePolicy('lt-annual')).rejects.toThrow('connection refused');
    });
  });

  describe('getPolicyById', () => {
    it('should return a policy when found', async () => {
      const policy = makePolicy();
      mockRepo.findById.mockResolvedValueOnce(policy);

      const result = await service.getPolicyById('lp-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(mockRepo.findById).toHaveBeenCalledWith('lp-1');
    });

    it('should return null when policy not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.getPolicyById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.findById.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getPolicyById('lp-1')).rejects.toThrow('db error');
    });
  });

  describe('getAllPolicies', () => {
    it('should return all policies', async () => {
      const policy1 = makePolicy({ id: 'lp-1' });
      const policy2 = makePolicy({ id: 'lp-2' });
      mockRepo.findAll.mockResolvedValueOnce([policy1, policy2]);

      const result = await service.getAllPolicies();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lp-1');
      expect(result[1].id).toBe('lp-2');
      expect(mockRepo.findAll).toHaveBeenCalled();
    });

    it('should return an empty array when no policies exist', async () => {
      mockRepo.findAll.mockResolvedValueOnce([]);

      const result = await service.getAllPolicies();

      expect(result).toEqual([]);
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.findAll.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getAllPolicies()).rejects.toThrow('db error');
    });
  });

  describe('createPolicy', () => {
    const createInput: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
      policyName: 'Sick Leave Policy',
      leaveTypeId: 'lt-sick',
      entitlementDays: 10,
      accrualRate: undefined,
      maxAccumulation: undefined,
      minimumNoticeDays: 1,
      requiresManagerApproval: false,
      isActive: true,
    };

    it('should create and return a fully-populated policy', async () => {
      const created = makePolicy({
        id: 'lp-new',
        policyName: 'Sick Leave Policy',
        leaveTypeId: 'lt-sick',
        entitlementDays: 10,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      mockRepo.create.mockResolvedValueOnce(created);

      const result = await service.createPolicy(createInput);

      expect(result.id).toBe('lp-new');
      expect(result.policyName).toBe('Sick Leave Policy');
      expect(result.leaveTypeId).toBe('lt-sick');
      expect(result.entitlementDays).toBe(10);
      expect(result.accrualRate).toBeUndefined();
      expect(result.maxAccumulation).toBeUndefined();
      expect(result.minimumNoticeDays).toBe(1);
      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockRepo.create).toHaveBeenCalledWith(createInput);
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockRepo.create.mockRejectedValueOnce(uniqueError);

      await expect(service.createPolicy(createInput)).rejects.toThrow(
        'duplicate key value violates unique constraint',
      );
    });

    it('should propagate general repository errors', async () => {
      mockRepo.create.mockRejectedValueOnce(new Error('db error'));

      await expect(service.createPolicy(createInput)).rejects.toThrow('db error');
    });
  });

  describe('updatePolicy', () => {
    it('should update and return the updated policy', async () => {
      const updated = makePolicy({
        policyName: 'Updated Policy',
        entitlementDays: 25,
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      });
      mockRepo.update.mockResolvedValueOnce(updated);

      const result = await service.updatePolicy('lp-1', {
        policyName: 'Updated Policy',
        entitlementDays: 25,
      });

      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Policy');
      expect(result!.entitlementDays).toBe(25);
      expect(mockRepo.update).toHaveBeenCalledWith('lp-1', {
        policyName: 'Updated Policy',
        entitlementDays: 25,
      });
    });

    it('should return null when no matching row exists', async () => {
      mockRepo.update.mockResolvedValueOnce(null);

      const result = await service.updatePolicy('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.update.mockRejectedValueOnce(new Error('db error'));

      await expect(service.updatePolicy('lp-1', { policyName: 'New Name' })).rejects.toThrow('db error');
    });
  });
});
