import { AuditService } from 'modules/audit/audit.service';
import { AuditLog, IAuditRepository } from 'modules/audit/audit.model';

function makeMockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: '1',
    entityType: 'leave_request',
    entityId: 'lr-1',
    action: 'APPROVED',
    oldValues: null,
    newValues: { status: 'APPROVED' },
    performedBy: 'user-1',
    performedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<IAuditRepository> {
  return {
    create: jest.fn(),
    findByEntity: jest.fn(),
    findByPerformer: jest.fn(),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new AuditService(repo);
  });

  describe('log', () => {
    it('delegates to repository.create and returns the created AuditLog', async () => {
      const entry = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVED',
        oldValues: null,
        newValues: { status: 'APPROVED' },
        performedBy: 'user-1',
      };
      const created = makeMockAuditLog();
      repo.create.mockResolvedValue(created);

      const result = await service.log(entry);
      expect(repo.create).toHaveBeenCalledWith(entry);
      expect(result).toEqual(created);
    });
  });

  describe('getEntityHistory', () => {
    it('delegates to repository.findByEntity with correct args and returns results', async () => {
      const logs = [
        makeMockAuditLog(),
        makeMockAuditLog({ id: '2', action: 'CREATED' }),
      ];
      repo.findByEntity.mockResolvedValue(logs);

      const result = await service.getEntityHistory('leave_request', 'lr-1');
      expect(repo.findByEntity).toHaveBeenCalledWith('leave_request', 'lr-1');
      expect(result).toEqual(logs);
    });

    it('returns empty array when no records exist', async () => {
      repo.findByEntity.mockResolvedValue([]);

      const result = await service.getEntityHistory('leave_request', 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getUserActions', () => {
    it('delegates to repository.findByPerformer with correct args and returns results', async () => {
      const logs = [makeMockAuditLog()];
      repo.findByPerformer.mockResolvedValue(logs);

      const result = await service.getUserActions('user-1');
      expect(repo.findByPerformer).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual(logs);
    });

    it('passes optional limit parameter to repository', async () => {
      const logs = [makeMockAuditLog()];
      repo.findByPerformer.mockResolvedValue(logs);

      const result = await service.getUserActions('user-1', 10);
      expect(repo.findByPerformer).toHaveBeenCalledWith('user-1', 10);
      expect(result).toEqual(logs);
    });

    it('returns empty array when no records exist', async () => {
      repo.findByPerformer.mockResolvedValue([]);

      const result = await service.getUserActions('unknown-user');
      expect(result).toEqual([]);
    });
  });
});
