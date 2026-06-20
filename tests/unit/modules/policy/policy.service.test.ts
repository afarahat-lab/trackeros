import { PolicyService } from '../../../../src/modules/policy/policy.service';
import { IPolicyRepository } from '../../../../src/modules/policy/policy.repository.interface';
import { LeavePolicy } from '../../../../src/shared/types';

describe('PolicyService', () => {
  let service: PolicyService;
  let repository: jest.Mocked<IPolicyRepository>;

  beforeEach(() => {
    repository = {
      findByLeaveTypeId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new PolicyService(repository);
  });

  describe('getPolicy', () => {
    it('should return the correct LeavePolicy for a given leaveTypeId', async () => {
      const mockPolicy: LeavePolicy = {
        id: '1',
        leaveTypeId: 'annual',
        maxDays: 20,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findByLeaveTypeId.mockResolvedValue(mockPolicy);

      const result = await service.getPolicy('annual');

      expect(result).toEqual(mockPolicy);
      expect(repository.findByLeaveTypeId).toHaveBeenCalledWith('annual');
    });
  });

  describe('validateRequest', () => {
    it('should return validation errors when policy limits are exceeded', async () => {
      const mockPolicy: LeavePolicy = {
        id: '1',
        leaveTypeId: 'annual',
        maxDays: 5,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findByLeaveTypeId.mockResolvedValue(mockPolicy);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-10'); // 10 days

      const result = await service.validateRequest('emp1', 'annual', startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Exceeds maximum days of 5');
    });

    it('should return isValid true when within policy limits', async () => {
      const mockPolicy: LeavePolicy = {
        id: '1',
        leaveTypeId: 'annual',
        maxDays: 10,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findByLeaveTypeId.mockResolvedValue(mockPolicy);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-05'); // 5 days

      const result = await service.validateRequest('emp1', 'annual', startDate, endDate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error if leave type not found', async () => {
      repository.findByLeaveTypeId.mockResolvedValue(null);

      const result = await service.validateRequest('emp1', 'unknown', new Date(), new Date());

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Leave type not found');
    });
  });
});
