import { AuditService } from 'modules/audit/audit.service';
import { IAuditRepository } from 'modules/audit/audit.repository';
import { AuditRecord } from 'modules/audit/audit.model';
import { AuditAction } from 'shared/types';

function makeAuditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'audit-1',
    entityType: 'LeaveRequest',
    entityId: 'lr-1',
    action: AuditAction.CREATE,
    oldValues: null,
    newValues: { status: 'SUBMITTED' },
    performedBy: 'emp-1',
    performedAt: new Date('2025-06-01T12:00:00Z'),
    createdAt: new Date('2025-06-01T12:00:00Z'),
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let mockRepo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByEntity: jest.fn(),
      findByPerformer: jest.fn(),
    };
    service = new AuditService(mockRepo);
  });

  describe('record', () => {
    it('creates an audit record and returns it', async () => {
      const persisted = makeAuditRecord();
      mockRepo.create.mockResolvedValueOnce(persisted);

      const result = await service.record(
        AuditAction.CREATE,
        'LeaveRequest',
        'lr-1',
        'emp-1',
        undefined,
        { status: 'SUBMITTED' },
      );

      expect(result).toEqual(persisted);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.entityType).toBe('LeaveRequest');
      expect(callArg.entityId).toBe('lr-1');
      expect(callArg.action).toBe(AuditAction.CREATE);
      expect(callArg.performedBy).toBe('emp-1');
      expect(callArg.oldValues).toBeNull();
      expect(callArg.newValues).toEqual({ status: 'SUBMITTED' });
      expect(callArg.performedAt).toBeInstanceOf(Date);
      expect(callArg.id).toBeDefined();
      expect(typeof callArg.id).toBe('string');
      expect(callArg.id.length).toBeGreaterThan(0);
    });

    it('defaults oldValues and newValues to null when omitted', async () => {
      const persisted = makeAuditRecord({
        oldValues: null,
        newValues: null,
      });
      mockRepo.create.mockResolvedValueOnce(persisted);

      const result = await service.record(
        AuditAction.DELETE,
        'LeaveRequest',
        'lr-2',
        'emp-2',
      );

      expect(result.oldValues).toBeNull();
      expect(result.newValues).toBeNull();

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.oldValues).toBeNull();
      expect(callArg.newValues).toBeNull();
    });

    it('generates a unique id for each audit record', async () => {
      const persisted1 = makeAuditRecord({ id: 'uuid-1' });
      const persisted2 = makeAuditRecord({ id: 'uuid-2' });
      mockRepo.create.mockResolvedValueOnce(persisted1);
      mockRepo.create.mockResolvedValueOnce(persisted2);

      await service.record(AuditAction.CREATE, 'T', '1', null);
      await service.record(AuditAction.CREATE, 'T', '1', null);

      const id1 = mockRepo.create.mock.calls[0][0].id;
      const id2 = mockRepo.create.mock.calls[1][0].id;
      expect(id1).not.toBe(id2);
    });

    it('propagates repository errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockRepo.create.mockRejectedValueOnce(dbError);

      await expect(
        service.record(AuditAction.CREATE, 'T', '1', null),
      ).rejects.toThrow('connection refused');
    });
  });
});
