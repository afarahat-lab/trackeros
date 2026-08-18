import { randomUUID } from 'crypto';
import { IAuditService } from './audit.service.interface';
import { IAuditRepository } from './audit.repository.interface';
import { AuditRecord } from './audit.model';

export class AuditService implements IAuditService {
  constructor(private readonly repository: IAuditRepository) {}

  async record(params: {
    entityType: string;
    entityId: string;
    action: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    performedBy: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: randomUUID(),
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValues: params.oldValues ?? null,
      newValues: params.newValues ?? null,
      performedBy: params.performedBy,
      performedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date(),
    };

    return this.repository.create(record);
  }
}
