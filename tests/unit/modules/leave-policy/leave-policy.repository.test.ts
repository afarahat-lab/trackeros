import { LeaveType } from '../../../../src/shared/types';
import {
  LeavePolicyRepository,
  ILeavePolicyRepository,
  LeavePolicy,
} from '../../../../src/modules/leave-policy';

describe('LeavePolicyRepository (stub)', () => {
  let repository: ILeavePolicyRepository;

  const validCreateInput: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
  };

  beforeEach(() => {
    repository = new LeavePolicyRepository();
  });

  describe('findById', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findById('lp-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByLeaveType', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByLeaveType(LeaveType.ANNUAL)).rejects.toThrow('not implemented');
    });
  });

  describe('findAllActive', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findAllActive()).rejects.toThrow('not implemented');
    });
  });

  describe('create', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.create(validCreateInput)).rejects.toThrow('not implemented');
    });

    it('should accept input without id, createdAt, and updatedAt', async () => {
      const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: null,
        requiresManagerApproval: false,
        isActive: true,
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });
  });

  describe('update', () => {
    it('should throw "not implemented"', async () => {
      await expect(
        repository.update('lp-001', { policyName: 'Updated Policy' }),
      ).rejects.toThrow('not implemented');
    });

    it('should accept a partial LeavePolicy update', async () => {
      const partialUpdate: Partial<LeavePolicy> = {
        entitlementDays: 25,
        isActive: false,
      };

      await expect(repository.update('lp-001', partialUpdate)).rejects.toThrow('not implemented');
    });

    it('should accept an empty partial update', async () => {
      await expect(repository.update('lp-001', {})).rejects.toThrow('not implemented');
    });
  });

  describe('interface contract', () => {
    it('should have all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByLeaveType).toBe('function');
      expect(typeof repository.findAllActive).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.update).toBe('function');
    });
  });
});
