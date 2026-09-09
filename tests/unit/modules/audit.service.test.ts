import { AuditLog, CreateAuditLogInput } from '../../../src/modules/audit';
import { IAuditRepository } from '../../../src/modules/audit';
import { AuditService } from '../../../src/modules/audit';
import { ValidationError, NotFoundError } from '../../../src/shared/errors';
import { AuditAction } from '../../../src/shared/types';

class FakeAuditRepository implements IAuditRepository {
  private rows: AuditLog[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `audit-${this.sequence}`;
  }

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: this.nextId(),
      ...input,
      occurredAt: new Date('2024-01-01T00:00:00.000Z'),
    };
    this.rows.push(auditLog);
    return auditLog;
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.rows.find((a) => a.id === id) ?? null;
  }
}

function makeInput(overrides: Partial<CreateAuditLogInput> = {}): CreateAuditLogInput {
  return {
    actorId: 'emp-1',
    action: AuditAction.APPROVE,
    entityType: 'leave_request',
    entityId: 'req-1',
    beforeState: { status: 'SUBMITTED' },
    afterState: { status: 'APPROVED' },
    ...overrides,
  };
}

describe('AuditService', () => {
  let repository: FakeAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repository = new FakeAuditRepository();
    service = new AuditService(repository);
  });

  describe('record', () => {
    it('returns an AuditLog whose id and occurredAt are defined and fields match input', async () => {
      const input = makeInput();
      const auditLog = await service.record(input);

      expect(auditLog.id).toBeDefined();
      expect(auditLog.occurredAt).toBeDefined();
      expect(auditLog.actorId).toBe(input.actorId);
      expect(auditLog.action).toBe(input.action);
      expect(auditLog.entityType).toBe(input.entityType);
      expect(auditLog.entityId).toBe(input.entityId);
      expect(auditLog.beforeState).toEqual(input.beforeState);
      expect(auditLog.afterState).toEqual(input.afterState);
    });

    it('rejects an empty actorId with ValidationError', async () => {
      await expect(service.record(makeInput({ actorId: '  ' }))).rejects.toThrow(
        ValidationError
      );
    });

    it('rejects an empty entityType with ValidationError', async () => {
      await expect(service.record(makeInput({ entityType: '' }))).rejects.toThrow(
        ValidationError
      );
    });

    it('rejects an empty entityId with ValidationError', async () => {
      await expect(service.record(makeInput({ entityId: '' }))).rejects.toThrow(
        ValidationError
      );
    });

    it('rejects a non-AuditAction action with ValidationError', async () => {
      await expect(
        service.record(makeInput({ action: 'NOT_AN_ACTION' as AuditAction }))
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('returns the audit log when found', async () => {
      const created = await service.record(makeInput());
      const found = await service.getById(created.id);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when the id is unknown', async () => {
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
