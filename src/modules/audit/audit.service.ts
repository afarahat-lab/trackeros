import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { EntityType } from '../../shared/types';
import { AuditLog } from './audit.model';
import { PgAuditLogRepository } from './audit.repository';
import { AuditRecordInput, IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  constructor(
    private readonly auditLogs: PgAuditLogRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async record(input: AuditRecordInput, client?: PoolClient): Promise<AuditLog> {
    return this.uow.withTransaction(async (tx) => {
      const db = client ?? tx;
      const now = new Date();
      const entry: AuditLog = {
        id: randomUUID(),
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValues: input.oldValues,
        newValues: input.newValues,
        performedBy: input.performedBy,
        performedAt: input.performedAt,
        createdAt: now,
        updatedAt: now,
      };
      return this.auditLogs.create(entry, db);
    });
  }

  async findByEntity(
    entityType: EntityType,
    entityId: string,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    return this.auditLogs.findByEntity(entityType, entityId, client);
  }

  async findByPerformedAt(
    from: Date,
    to: Date,
    client?: PoolClient,
  ): Promise<AuditLog[]> {
    return this.auditLogs.findByPerformedAt(from, to, client);
  }
}
