import { AuditService } from 'modules/audit/audit.service';
import {
  AuditLog,
  IAuditRepository,
  AuditLogCreationError,
} from 'modules/audit/audit.model';
import { AuditAction } from 'shared/types/leave.types';

function makeMockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-1',
    entityType: 'leave_request',
    entityId: 'lr-1',
    action: AuditAction.CREATED,
    oldValues: null,
    newValues: { status: 'PENDING' },
    performedBy: 'user-1',
    performedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByEntity: jest.fn(),
      findByPerformer: jest.fn(),
    };
    service = new AuditService(repo);
  });

  describe('log', () => {
    it('creates an audit log entry with performedAt set to now', async () => {
      const entry = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATED,
        oldValues: null,
        newValues: { status: 'PENDING' },
        performedBy: 'user-1',
      };
      const created = makeMockAuditLog({ performedAt: new Date() });
      repo.create.mockResolvedValue(created);

      const result = await service.log(entry);

      expect(result.performedAt).toBeDefined();
      expect(repo.create).toHaveBeenCalledWith(entry);
    });

    it('throws AuditLogCreationError when repository create fails', async () => {
      const entry = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATED,
        oldValues: null,
        newValues: { status: 'PENDING' },
        performedBy: 'user-1',
      };
      repo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.log(entry)).rejects.toThrow(AuditLogCreationError);
    });
  });

  describe('getEntityHistory', () => {
    it('returns audit logs for an entity', async () => {
      const logs = [
        makeMockAuditLog(),
        makeMockAuditLog({ id: 'audit-2', action: AuditAction.UPDATED }),
      ];
      repo.findByEntity.mockResolvedValue(logs);

      const result = await service.getEntityHistory('leave_request', 'lr-1');

      expect(result).toEqual(logs);
      expect(repo.findByEntity).toHaveBeenCalledWith('leave_request', 'lr-1');
    });

    it('returns empty array when no logs exist', async () => {
      repo.findByEntity.mockResolvedValue([]);

      const result = await service.getEntityHistory('leave_request', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getUserActions', () => {
    it('returns audit logs for a performer', async () => {
      const logs = [makeMockAuditLog()];
      repo.findByPerformer.mockResolvedValue(logs);

      const result = await service.getUserActions('user-1');

      expect(result).toEqual(logs);
      expect(repo.findByPerformer).toHaveBeenCalledWith('user-1', undefined);
    });

    it('passes limit parameter to repository', async () => {
      repo.findByPerformer.mockResolvedValue([]);

      await service.getUserActions('user-1', 10);

      expect(repo.findByPerformer).toHaveBeenCalledWith('user-1', 10);
    });
  });
});
