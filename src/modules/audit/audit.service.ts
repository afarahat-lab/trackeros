import { IAuditRepository } from './audit.repository';
import { AuditRecord, AuditAction, CreateAuditRecordDto } from './audit.model';

export interface IAuditService {
  recordAction(
    entityType: string,
    entityId: string,
    action: AuditAction,
    changedBy: string | null,
    details: {
      oldValues?: Record<string, any> | null;
      newValues?: Record<string, any> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }
  ): Promise<AuditRecord>;
}

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async recordAction(
    entityType: string,
    entityId: string,
    action: AuditAction,
    changedBy: string | null,
    details: {
      oldValues?: Record<string, any> | null;
      newValues?: Record<string, any> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }
  ): Promise<AuditRecord> {
    const input: CreateAuditRecordDto = {
      entityType,
      entityId,
      action,
      performedBy: changedBy ?? undefined,
      oldValues: details.oldValues ?? undefined,
      newValues: details.newValues ?? undefined,
      ipAddress: details.ipAddress ?? undefined,
      userAgent: details.userAgent ?? undefined,
    };
    return this.auditRepository.create(input);
  }
}
