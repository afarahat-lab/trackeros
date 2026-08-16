import { AuditService } from '../../../../src/modules/audit/audit.service';
import { IAuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditLog } from '../../../../src/modules/audit/audit.model';

describe('AuditService', () => {
  let mockRepository: jest.Mocked<IAuditRepository>;
  let service: AuditService;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEntity: jest.fn(),
    };
    service = new AuditService(mockRepository);
  });

  describe('log', () => {
    it('should delegate to repository.create with performedAt set to now', async () => {
      const beforeCall = new Date();

      const params = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVE',
        oldValues: { status: 'SUBMITTED' },
        newValues: { status: 'APPROVED' },
        performedBy: 'mgr-1',
      };

      const createdLog: AuditLog = {
        id: 'audit-1',
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVE',
        oldValues: { status: 'SUBMITTED' },
        newValues: { status: 'APPROVED' },
        performedBy: 'mgr-1',
        performedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValueOnce(createdLog);

      await service.log(params);

      const afterCall = new Date();

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      const callArg = mockRepository.create.mock.calls[0][0];
      expect(callArg.entityType).toBe('leave_request');
      expect(callArg.entityId).toBe('lr-1');
      expect(callArg.action).toBe('APPROVE');
      expect(callArg.oldValues).toEqual({ status: 'SUBMITTED' });
      expect(callArg.newValues).toEqual({ status: 'APPROVED' });
      expect(callArg.performedBy).toBe('mgr-1');
      expect(callArg.performedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(callArg.performedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should handle null oldValues and newValues', async () => {
      const params = {
        entityType: 'employee',
        entityId: 'emp-1',
        action: 'CREATE',
        oldValues: null,
        newValues: null,
        performedBy: null,
      };

      mockRepository.create.mockResolvedValueOnce({
        id: 'audit-1',
        ...params,
        performedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.log(params);

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      const callArg = mockRepository.create.mock.calls[0][0];
      expect(callArg.oldValues).toBeNull();
      expect(callArg.newValues).toBeNull();
      expect(callArg.performedBy).toBeNull();
    });

    it('should propagate repository errors', async () => {
      const params = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVE',
        oldValues: null,
        newValues: null,
        performedBy: 'mgr-1',
      };

      const dbError = new Error('Connection refused');
      mockRepository.create.mockRejectedValueOnce(dbError);

      await expect(service.log(params)).rejects.toThrow('Connection refused');
    });

    it('should return void on success', async () => {
      const params = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVE',
        oldValues: null,
        newValues: null,
        performedBy: 'mgr-1',
      };

      mockRepository.create.mockResolvedValueOnce({
        id: 'audit-1',
        ...params,
        performedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.log(params);
      expect(result).toBeUndefined();
    });
  });
});
