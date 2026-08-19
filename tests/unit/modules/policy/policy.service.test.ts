import { LeavePolicyService, ValidationError } from '../../../../src/modules/policy/policy.service';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { CreateLeavePolicyDto, UpdateLeavePolicyDto } from '../../../../src/modules/policy/policy.service.interface';
import { LeaveType } from '../../../../src/shared/types/index';

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'policy-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<ILeavePolicyRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByLeaveType: jest.fn(),
    findActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('LeavePolicyService', () => {
  let service: LeavePolicyService;
  let repo: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new LeavePolicyService(repo);
  });

  describe('getById', () => {
    it('should return policy when found', async () => {
      const policy = makePolicy();
      repo.findById.mockResolvedValue(policy);

      const result = await service.getById('policy-1');
      expect(result).toEqual(policy);
      expect(repo.findById).toHaveBeenCalledWith('policy-1');
    });

    it('should return null when not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all policies', async () => {
      const policies = [makePolicy(), makePolicy({ id: 'policy-2', policyName: 'Sick Leave', leaveType: LeaveType.SICK })];
      repo.findAll.mockResolvedValue(policies);

      const result = await service.getAll();
      expect(result).toEqual(policies);
      expect(repo.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no policies', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getByLeaveType', () => {
    it('should return policies for a given leave type', async () => {
      const policies = [makePolicy({ leaveType: LeaveType.SICK })];
      repo.findByLeaveType.mockResolvedValue(policies);

      const result = await service.getByLeaveType(LeaveType.SICK);
      expect(result).toEqual(policies);
      expect(repo.findByLeaveType).toHaveBeenCalledWith(LeaveType.SICK);
    });

    it('should return empty array when no policies for leave type', async () => {
      repo.findByLeaveType.mockResolvedValue([]);

      const result = await service.getByLeaveType(LeaveType.EMERGENCY);
      expect(result).toEqual([]);
    });
  });

  describe('getActive', () => {
    it('should return active policies', async () => {
      const policies = [makePolicy({ isActive: true })];
      repo.findActive.mockResolvedValue(policies);

      const result = await service.getActive();
      expect(result).toEqual(policies);
      expect(repo.findActive).toHaveBeenCalled();
    });

    it('should return empty array when no active policies', async () => {
      repo.findActive.mockResolvedValue([]);

      const result = await service.getActive();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const validDto: CreateLeavePolicyDto = {
      policyName: 'Annual Leave',
      leaveType: LeaveType.ANNUAL,
      entitlementDays: 20,
    };

    it('should create a policy with valid data', async () => {
      const created = makePolicy();
      repo.create.mockResolvedValue(created);

      const result = await service.create(validDto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        policyName: 'Annual Leave',
        leaveType: LeaveType.ANNUAL,
        entitlementDays: 20,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: null,
        requiresManagerApproval: true,
        isActive: true,
      });
    });

    it('should accept optional fields', async () => {
      const dto: CreateLeavePolicyDto = {
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: 1.5,
        maxAccumulation: 30,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
      };
      const created = makePolicy({
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: 1.5,
        maxAccumulation: 30,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
      });
      repo.create.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: 1.5,
        maxAccumulation: 30,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
        isActive: true,
      });
    });

    it('should reject when policyName is empty', async () => {
      await expect(service.create({ ...validDto, policyName: '' }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, policyName: '  ' }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when leaveType is invalid', async () => {
      await expect(service.create({ ...validDto, leaveType: 'INVALID' as LeaveType }))
        .rejects.toThrow(ValidationError);
    });

    it('should reject when entitlementDays is not positive', async () => {
      await expect(service.create({ ...validDto, entitlementDays: 0 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, entitlementDays: -5 }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, entitlementDays: NaN }))
        .rejects.toThrow(ValidationError);
      await expect(service.create({ ...validDto, entitlementDays: Infinity }))
        .rejects.toThrow(ValidationError);
    });

    it('should trim whitespace from policyName', async () => {
      const created = makePolicy();
      repo.create.mockResolvedValue(created);

      await service.create({ ...validDto, policyName: '  Annual Leave  ' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ policyName: 'Annual Leave' }),
      );
    });
  });

  describe('update', () => {
    it('should update an existing policy', async () => {
      const existing = makePolicy();
      const updated = makePolicy({ policyName: 'Updated Policy', updatedAt: new Date() });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const data: UpdateLeavePolicyDto = { policyName: 'Updated Policy' };
      const result = await service.update('policy-1', data);
      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith('policy-1', expect.objectContaining({ policyName: 'Updated Policy' }));
    });

    it('should return null when policy does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.update('nonexistent', { policyName: 'X' });
      expect(result).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should reject when policyName is whitespace-only', async () => {
      const existing = makePolicy();
      repo.findById.mockResolvedValue(existing);

      await expect(service.update('policy-1', { policyName: '  ' }))
        .rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should reject when leaveType is invalid', async () => {
      const existing = makePolicy();
      repo.findById.mockResolvedValue(existing);

      await expect(service.update('policy-1', { leaveType: 'INVALID' as LeaveType }))
        .rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should reject when entitlementDays is non-positive', async () => {
      const existing = makePolicy();
      repo.findById.mockResolvedValue(existing);

      await expect(service.update('policy-1', { entitlementDays: 0 }))
        .rejects.toThrow(ValidationError);
      await expect(service.update('policy-1', { entitlementDays: -1 }))
        .rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should allow updating with valid leaveType', async () => {
      const existing = makePolicy();
      const updated = makePolicy({ leaveType: LeaveType.SICK });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('policy-1', { leaveType: LeaveType.SICK });
      expect(result).toEqual(updated);
    });

    it('should trim whitespace from policyName on update', async () => {
      const existing = makePolicy();
      const updated = makePolicy({ policyName: 'Trimmed' });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      await service.update('policy-1', { policyName: '  Trimmed  ' });
      expect(repo.update).toHaveBeenCalledWith(
        'policy-1',
        expect.objectContaining({ policyName: 'Trimmed' }),
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active policy', async () => {
      const existing = makePolicy({ isActive: true });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(makePolicy({ isActive: false }));

      const result = await service.deactivate('policy-1');
      expect(result).toBe(true);
      expect(repo.update).toHaveBeenCalledWith('policy-1', {
        isActive: false,
        updatedAt: expect.any(Date) as Date,
      });
    });

    it('should return false when policy does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.deactivate('nonexistent');
      expect(result).toBe(false);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should return true when policy is already inactive (idempotent)', async () => {
      const existing = makePolicy({ isActive: false });
      repo.findById.mockResolvedValue(existing);

      const result = await service.deactivate('policy-1');
      expect(result).toBe(true);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
