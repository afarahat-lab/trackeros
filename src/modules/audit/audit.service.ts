import { AuditRecord } from './audit.model';
import { IAuditRepository } from './audit.repository';
import { IAuditService, CreateAuditRecordDto } from './audit.service.interface';
import { AuditAction } from '../../shared/types/index';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const VALID_AUDIT_ACTIONS: ReadonlySet<string> = new Set(Object.values(AuditAction));

export class AuditService implements IAuditService {
  constructor(private readonly repository: IAuditRepository) {}

  async log(record: CreateAuditRecordDto): Promise<AuditRecord> {
    if (!record.entityType || record.entityType.trim().length === 0) {
      throw new ValidationError('entityType is required and must not be empty');
    }
    if (!record.entityId || record.entityId.trim().length === 0) {
      throw new ValidationError('entityId is required and must not be empty');
    }
    if (!record.action || !VALID_AUDIT_ACTIONS.has(record.action)) {
      throw new ValidationError('action must be a valid AuditAction');
    }
    if (!record.performedBy || record.performedBy.trim().length === 0) {
      throw new ValidationError('performedBy is required and must not be empty');
    }

    return this.repository.create({
      entityType: record.entityType.trim(),
      entityId: record.entityId.trim(),
      action: record.action,
      performedBy: record.performedBy.trim(),
      changes: record.changes ?? null,
      timestamp: new Date(),
    });
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]> {
    return this.repository.findByEntity(entityType, entityId);
  }

  async getUserActions(performedBy: string): Promise<AuditRecord[]> {
    return this.repository.findByUser(performedBy);
  }

  async getByDateRange(start: Date, end: Date): Promise<AuditRecord[]> {
    return this.repository.findByDateRange(start, end);
  }
}
