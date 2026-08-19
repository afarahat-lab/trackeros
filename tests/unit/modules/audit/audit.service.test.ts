import { AuditService, ValidationError } from '../../../../src/modules/audit/audit.service';
import { IAuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditRecord } from '../../../../src/modules/audit/audit.model';
import { CreateAuditRecordDto } from '../../../../src/modules/audit/audit.service.interface';
import { AuditAction } from '../../../../src/shared/types/index';

function makeAuditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'audit-1',
    entityType: 'leave_request',
    entityId: 'lr-1',
    action: AuditAction.CREATED,
    performedBy: 'user-1',
    changes: { status: 'SUBMITTED' },
    timestamp: new Date('2024-06-15T10:00:00Z'),
    createdAt: new Date('2024-06-15T10:00:01Z'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<IAuditRepository> {
  return {
    create: jest.fn(),
    findByEntity: jest.fn(),
    findByUser: jest.fn(),
    findByDateRange: jest.fn(),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new AuditService(repo);
    jest.clearAllMocks();
  });

  describe('log', () => {
    const validDto: CreateAuditRecordDto = {
      entityType: 'leave_request',
      entityId: 'lr-1',
      action: AuditAction.CREATED,
      performedBy: 'user-1',
      changes: { status: 'SUBMITTED' },
    };

    it('should create an audit record with valid data', async () => {
      const created = makeAuditRecord();
      repo.create.mockResolvedValue(created);

      const result = await service.log(validDto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATED,
        performedBy: 'user-1',
        changes: { status: 'SUBMITTED' },
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should set timestamp to current time', async () => {
      const before = new Date();
      const created = makeAuditRecord();
      repo.create.mockResolvedValue(created);

      await service.log(validDto);
      const callArg = repo.create.mock.calls[0][0];
      const timestamp = callArg.timestamp;
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should default changes to null when not provided', async () => {
      const dto: CreateAuditRecordDto = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.DELETED,
        performedBy: 'user-1',
      };
      const created = makeAuditRecord({ action: AuditAction.DELETED, changes: null });
      repo.create.mockResolvedValue(created);

      const result = await service.log(dto);
      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ changes: null })
      );
    });

    it('should trim whitespace from entityType, entityId, and performedBy', async () => {
      const created = makeAuditRecord();
      repo.create.mockResolvedValue(created);

      await service.log({
        entityType: '  leave_request  ',
        entityId: '  lr-1  ',
        action: AuditAction.CREATED,
        performedBy: '  user-1  ',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'leave_request',
          entityId: 'lr-1',
          performedBy: 'user-1',
        })
      );
    });

    it('should reject when entityType is empty', async () => {
      await expect(
        service.log({ ...validDto, entityType: '' })
      ).rejects.toThrow(ValidationError);
      await expect(
        service.log({ ...validDto, entityType: '  ' })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject when entityId is empty', async () => {
      await expect(
        service.log({ ...validDto, entityId: '' })
      ).rejects.toThrow(ValidationError);
      await expect(
        service.log({ ...validDto, entityId: '  ' })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject when action is invalid', async () => {
      await expect(
        service.log({ ...validDto, action: 'INVALID' as AuditAction })
      ).rejects.toThrow(ValidationError);
      await expect(
        service.log({ ...validDto, action: '' as AuditAction })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject when performedBy is empty', async () => {
      await expect(
        service.log({ ...validDto, performedBy: '' })
      ).rejects.toThrow(ValidationError);
      await expect(
        service.log({ ...validDto, performedBy: '  ' })
      ).rejects.toThrow(ValidationError);
    });

    it('should accept all valid AuditAction values', async () => {
      const created = makeAuditRecord();
      repo.create.mockResolvedValue(created);

      for (const action of Object.values(AuditAction)) {
        await service.log({ ...validDto, action });
        expect(repo.create).toHaveBeenCalledWith(
          expect.objectContaining({ action })
        );
      }
    });
  });

  describe('getEntityHistory', () => {
    it('should return audit records for an entity', async () => {
      const records = [
        makeAuditRecord(),
        makeAuditRecord({ id: 'audit-2', action: AuditAction.UPDATED }),
      ];
      repo.findByEntity.mockResolvedValue(records);

      const result = await service.getEntityHistory('leave_request', 'lr-1');
      expect(result).toEqual(records);
      expect(repo.findByEntity).toHaveBeenCalledWith('leave_request', 'lr-1');
    });

    it('should return empty array when no records found', async () => {
      repo.findByEntity.mockResolvedValue([]);

      const result = await service.getEntityHistory('leave_request', 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getUserActions', () => {
    it('should return audit records for a user', async () => {
      const records = [makeAuditRecord()];
      repo.findByUser.mockResolvedValue(records);

      const result = await service.getUserActions('user-1');
      expect(result).toEqual(records);
      expect(repo.findByUser).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when user has no actions', async () => {
      repo.findByUser.mockResolvedValue([]);

      const result = await service.getUserActions('unknown-user');
      expect(result).toEqual([]);
    });
  });

  describe('getByDateRange', () => {
    it('should return audit records within date range', async () => {
      const start = new Date('2024-06-01');
      const end = new Date('2024-06-30');
      const records = [makeAuditRecord()];
      repo.findByDateRange.mockResolvedValue(records);

      const result = await service.getByDateRange(start, end);
      expect(result).toEqual(records);
      expect(repo.findByDateRange).toHaveBeenCalledWith(start, end);
    });

    it('should return empty array when no records in range', async () => {
      const start = new Date('2020-01-01');
      const end = new Date('2020-01-31');
      repo.findByDateRange.mockResolvedValue([]);

      const result = await service.getByDateRange(start, end);
      expect(result).toEqual([]);
    });
  });
});
