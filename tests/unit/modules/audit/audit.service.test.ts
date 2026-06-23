import { AuditService } from '../../../../src/modules/audit/audit.service';
import { IAuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditAction } from '../../../../src/modules/audit/audit.model';

describe('AuditService', () => {
  let service: AuditService;
  let mockRepository: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEntity: jest.fn(),
    };
    service = new AuditService(mockRepository);
  });

  describe('recordAction', () => {
    it('should construct a CreateAuditRecordDto and call repository.create', async () => {
      const expectedRecord = {
        id: 'audit-1',
        entity_type: 'leave_request',
        entity_id: '123',
        action: AuditAction.CREATE,
        old_values: null,
        new_values: { status: 'pending' },
        performed_by: 'user-1',
        ip_address: '127.0.0.1',
        user_agent: 'jest',
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(expectedRecord as any);

      const result = await service.recordAction(
        'leave_request',
        '123',
        AuditAction.CREATE,
        'user-1',
        {
          newValues: { status: 'pending' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }
      );

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        entityType: 'leave_request',
        entityId: '123',
        action: AuditAction.CREATE,
        performedBy: 'user-1',
        oldValues: undefined,
        newValues: { status: 'pending' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });
      expect(result).toEqual(expectedRecord);
    });

    it('should handle null changedBy', async () => {
      const expectedRecord = {
        id: 'audit-2',
        entity_type: 'leave_request',
        entity_id: '123',
        action: AuditAction.DELETE,
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(expectedRecord as any);

      const result = await service.recordAction(
        'leave_request',
        '123',
        AuditAction.DELETE,
        null,
        {}
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        entityType: 'leave_request',
        entityId: '123',
        action: AuditAction.DELETE,
        performedBy: undefined,
        oldValues: undefined,
        newValues: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      });
      expect(result).toEqual(expectedRecord);
    });

    it('should pass oldValues and newValues correctly', async () => {
      const expectedRecord = {
        id: 'audit-3',
        entity_type: 'leave_request',
        entity_id: '123',
        action: AuditAction.UPDATE,
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(expectedRecord as any);

      await service.recordAction(
        'leave_request',
        '123',
        AuditAction.UPDATE,
        'user-1',
        {
          oldValues: { status: 'pending' },
          newValues: { status: 'approved' },
        }
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        entityType: 'leave_request',
        entityId: '123',
        action: AuditAction.UPDATE,
        performedBy: 'user-1',
        oldValues: { status: 'pending' },
        newValues: { status: 'approved' },
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });
});
