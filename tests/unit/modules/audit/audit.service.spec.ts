import { AuditService } from 'modules/audit/audit.service';
import { IAuditRepository } from 'modules/audit/audit.repository.interface';
import { AuditRecord, AuditAction } from 'modules/audit/audit.model';

const makeAuditRecord = (overrides: Partial<AuditRecord> = {}): AuditRecord => ({
  id: 'audit-1',
  entityType: 'LeaveRequest',
  entityId: 'lr-1',
  action: AuditAction.CREATE,
  oldValues: null,
  newValues: { status: 'PENDING' },
  performedBy: 'emp-1',
  performedAt: new Date('2026-01-15T10:00:00Z'),
  createdAt: new Date('2026-01-15T10:00:00Z'),
  ...overrides,
});

describe('AuditService', () => {
  let mockRepo: jest.Mocked<IAuditRepository>;
  let service: AuditService;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByEntity: jest.fn(),
      findByPerformer: jest.fn(),
      findByDateRange: jest.fn(),
    };
    service = new AuditService(mockRepo);
  });

  describe('log', () => {
    it('should set performedAt and delegate to repository.create', async () => {
      const input = {
        entityType: 'LeaveRequest',
        entityId: 'lr-1',
        action: AuditAction.APPROVE,
        oldValues: { status: 'PENDING' },
        newValues: { status: 'APPROVED' },
        performedBy: 'mgr-1',
      };

      const expectedRecord = makeAuditRecord({
        ...input,
        performedAt: expect.any(Date) as unknown as Date,
      });

      mockRepo.create.mockResolvedValue(expectedRecord);

      const result = await service.log(input);

      expect(result).toEqual(expectedRecord);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);

      const calledWith = mockRepo.create.mock.calls[0][0];
      expect(calledWith.entityType).toBe('LeaveRequest');
      expect(calledWith.entityId).toBe('lr-1');
      expect(calledWith.action).toBe(AuditAction.APPROVE);
      expect(calledWith.oldValues).toEqual({ status: 'PENDING' });
      expect(calledWith.newValues).toEqual({ status: 'APPROVED' });
      expect(calledWith.performedBy).toBe('mgr-1');
      expect(calledWith.performedAt).toBeInstanceOf(Date);
    });

    it('should propagate errors from repository.create', async () => {
      mockRepo.create.mockRejectedValue(new Error('DB constraint violation'));

      await expect(
        service.log({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: AuditAction.CREATE,
          oldValues: null,
          newValues: { status: 'PENDING' },
          performedBy: 'emp-1',
        }),
      ).rejects.toThrow('DB constraint violation');
    });
  });

  describe('getHistory', () => {
    it('should delegate to repository.findByEntity', async () => {
      const records = [
        makeAuditRecord({ id: 'a1', action: AuditAction.CREATE }),
        makeAuditRecord({ id: 'a2', action: AuditAction.APPROVE }),
      ];
      mockRepo.findByEntity.mockResolvedValue(records);

      const result = await service.getHistory('LeaveRequest', 'lr-1');

      expect(result).toEqual(records);
      expect(mockRepo.findByEntity).toHaveBeenCalledWith('LeaveRequest', 'lr-1');
    });

    it('should return empty array when no records exist', async () => {
      mockRepo.findByEntity.mockResolvedValue([]);

      const result = await service.getHistory('LeaveRequest', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      mockRepo.findByEntity.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.getHistory('LeaveRequest', 'lr-1')).rejects.toThrow('DB connection failed');
    });
  });
});
