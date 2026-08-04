import { randomUUID } from 'crypto';
import { AuditRecord } from './audit.model';
import { AuditAction } from '../../shared/types';
import { IAuditRepository } from './audit.repository';

export interface IAuditService {
  record(
    action: AuditAction,
    entityType: string,
    entityId: string,
    performedBy: string | null,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
  ): Promise<AuditRecord>;
}

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async record(
    action: AuditAction,
    entityType: string,
    entityId: string,
    performedBy: string | null,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
  ): Promise<AuditRecord> {
    const id = randomUUID();
    return this.auditRepository.create({
      id,
      entityType,
      entityId,
      action,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      performedBy,
      performedAt: new Date(),
    });
  }
}
