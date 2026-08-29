import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

import {
  AuditLog,
  AuditLogInput,
  IAuditLogRepository,
  IAuditService
} from './audit.model';
import { PgAuditLogRepository } from './audit.repository';

export class AuditService implements IAuditService {
  private readonly repository: IAuditLogRepository;

  constructor(repository: IAuditLogRepository = new PgAuditLogRepository()) {
    this.repository = repository;
  }

  async record(input: AuditLogInput, client?: PoolClient): Promise<AuditLog> {
    const log: AuditLog = {
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      performedBy: input.performedBy ?? null,
      performedAt: new Date()
    };
    return this.repository.create(log, client);
  }
}
