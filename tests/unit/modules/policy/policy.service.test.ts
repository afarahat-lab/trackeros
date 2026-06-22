import { PolicyService } from '../../../../src/modules/policy/policy.service';
import { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { AppError } from '../../../../src/shared/types';
import { LeavePolicy, CreateLeavePolicyDto } from '../../../../src/modules/policy/policy.model';

describe('PolicyService', () => {
  let service: PolicyService;
  let repository: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByLeaveTypeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
    };
    service = new PolicyService(repository);
  });

  const mockPolicy: LeavePolicy = {
    id: '1',
    leaveTypeId: 'lt1',
    maxDaysPerYear: 20,
    maxConsecutiveDays: 5,
    requiresApproval: true,
    allowNegativeBalance: false,
    blackoutDates: [],
    status: 'active',
  };

  describe('getPolicyById', () => {
    it('should return a policy if found', async () => {
      repository.findById.mockResolvedValue(mockPolicy);
      const result = await service.getPolicyById('1');
      expect(result).toEqual(mockPolicy);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw AppError if id is invalid', async () => {
      await expect(service.getPolicyById('')).rejects.toThrow(AppError);
    });

    it('should throw AppError if policy not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getPolicyById('1')).rejects.toThrow(AppError);
    });
  });

  describe('getPolicyByLeaveTypeId', () => {
    it('should return a policy if found', async () => {
      repository.findByLeaveTypeId.mockResolvedValue(mockPolicy);
      const result = await service.getPolicyByLeaveTypeId('lt1');
      expect(result).toEqual(mockPolicy);
    });

    it('should throw AppError if leaveTypeId is invalid', async () => {
      await expect(service.getPolicyByLeaveTypeId('')).rejects.toThrow(AppError);
    });

    it('should throw AppError if policy not found', async () => {
      repository.findByLeaveTypeId.mockResolvedValue(null);
      await expect(service.getPolicyByLeaveTypeId('lt1')).rejects.toThrow(AppError);
    });
  });

  describe('createPolicy', () => {
    it('should create and return a policy', async () => {
      const dto: CreateLeavePolicyDto = {
        leaveTypeId: 'lt1',
        maxDaysPerYear: 20,
        maxConsecutiveDays: 5,
      };
      repository.create.mockResolvedValue(mockPolicy);
      const result = await service.createPolicy(dto);
      expect(result).toEqual(mockPolicy);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw AppError if required fields are missing', async () => {
      const dto = { leaveTypeId: 'lt1' } as any;
      await expect(service.createPolicy(dto)).rejects.toThrow(AppError);
    });
  });

  describe('updatePolicy', () => {
    it('should update and return a policy', async () => {
      const dto = { maxDaysPerYear: 25 };
      repository.update.mockResolvedValue({ ...mockPolicy, maxDaysPerYear: 25 });
      const result = await service.updatePolicy('1', dto);
      expect(result.maxDaysPerYear).toBe(25);
      expect(repository.update).toHaveBeenCalledWith('1', dto);
    });

    it('should throw AppError if id is invalid', async () => {
      await expect(service.updatePolicy('', {})).rejects.toThrow(AppError);
    });
  });

  describe('archivePolicy', () => {
    it('should archive and return a policy', async () => {
      repository.archive.mockResolvedValue({ ...mockPolicy, status: 'archived' });
      const result = await service.archivePolicy('1');
      expect(result.status).toBe('archived');
      expect(repository.archive).toHaveBeenCalledWith('1');
    });

    it('should throw AppError if id is invalid', async () => {
      await expect(service.archivePolicy('')).rejects.toThrow(AppError);
    });
  });
});
