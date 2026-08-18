import { AuditService } from '../../../../src/modules/audit/audit.service';
import { IAuditRepository } from '../../../../src/modules/audit/audit.repository.interface';
import { AuditRecord } from '../../../../src/modules/audit/audit.model';

describe('AuditService', () => {
  let mockRepository: jest.Mocked<IAuditRepository>;
  let auditService: AuditService;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEntity: jest.fn(),
    };
    auditService = new AuditService(mockRepository);
  });

  describe('record', () => {
    it('should construct an AuditRecord and delegate to repository.create', async () => {
      const createdRecord: AuditRecord = {
        id: 'test-uuid',
        entityType: 'LeaveRequest',
        entityId: 'lr-1',
        action: 'CREATE',
        oldValues: null,
        newValues: { status: 'DRAFT' },
        performedBy: 'user-1',
        performedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(createdRecord);

      const result = await auditService.record({
        entityType: 'LeaveRequest',
        entityId: 'lr-1',
        action: 'CREATE',
        newValues: { status: 'DRAFT' },
        performedBy: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(mockRepository.create).toHaveBeenCalledTimes(1);

      const passedRecord: AuditRecord = mockRepository.create.mock.calls[0][0];
      expect(passedRecord.entityType).toBe('LeaveRequest');
      expect(passedRecord.entityId).toBe('lr-1');
      expect(passedRecord.action).toBe('CREATE');
      expect(passedRecord.newValues).toEqual({ status: 'DRAFT' });
      expect(passedRecord.oldValues).toBeNull();
      expect(passedRecord.performedBy).toBe('user-1');
      expect(passedRecord.ipAddress).toBe('127.0.0.1');
      expect(passedRecord.userAgent).toBe('test-agent');
      expect(passedRecord.id).toBeDefined();
      expect(passedRecord.id).toHaveLength(36); // UUID v4
      expect(passedRecord.performedAt).toBeInstanceOf(Date);
      expect(passedRecord.createdAt).toBeInstanceOf(Date);

      expect(result).toBe(createdRecord);
    });

    it('should default oldValues and newValues to null when not provided', async () => {
      const createdRecord: AuditRecord = {
        id: 'test-uuid',
        entityType: 'Employee',
        entityId: 'emp-1',
        action: 'UPDATE',
        oldValues: null,
        newValues: null,
        performedBy: 'user-1',
        performedAt: new Date(),
        ipAddress: undefined,
        userAgent: undefined,
        createdAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(createdRecord);

      await auditService.record({
        entityType: 'Employee',
        entityId: 'emp-1',
        action: 'UPDATE',
        performedBy: 'user-1',
      });

      const passedRecord: AuditRecord = mockRepository.create.mock.calls[0][0];
      expect(passedRecord.oldValues).toBeNull();
      expect(passedRecord.newValues).toBeNull();
      expect(passedRecord.ipAddress).toBeUndefined();
      expect(passedRecord.userAgent).toBeUndefined();
    });

    it('should propagate errors from the repository', async () => {
      const dbError = new Error('Connection refused');
      mockRepository.create.mockRejectedValue(dbError);

      await expect(
        auditService.record({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: 'CREATE',
          performedBy: 'user-1',
        })
      ).rejects.toThrow('Connection refused');
    });

    it('should generate a unique id for each record', async () => {
      mockRepository.create.mockResolvedValue({} as AuditRecord);

      await auditService.record({
        entityType: 'LeaveRequest',
        entityId: 'lr-1',
        action: 'CREATE',
        performedBy: 'user-1',
      });

      const firstId = mockRepository.create.mock.calls[0][0].id;

      await auditService.record({
        entityType: 'LeaveRequest',
        entityId: 'lr-2',
        action: 'CREATE',
        performedBy: 'user-1',
      });

      const secondId = mockRepository.create.mock.calls[1][0].id;

      expect(firstId).not.toBe(secondId);
    });
  });
});
