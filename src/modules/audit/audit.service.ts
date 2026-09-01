import type { PoolClient } from 'pg';

import type { AuditLog, AuditLogInput } from './audit.model';
import { AuditLogRepository } from './audit.repository';
import type { IAuditLogRepository } from './audit.repository';
import type { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  private readonly repository: IAuditLogRepository;

  constructor(repository?: IAuditLogRepository) {
    this.repository = repository ?? new AuditLogRepository();
  }

  record(entry: AuditLogInput, client?: PoolClient): Promise<AuditLog> {
    return this.repository.record(entry, client);
  }

  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.repository.findByEntity(entityType, entityId);
  }

  findByActor(performedBy: string): Promise<AuditLog[]> {
    return this.repository.findByActor(performedBy);
  }

  findByTimeRange(from: Date, to: Date): Promise<AuditLog[]> {
    return this.repository.findByTimeRange(from, to);
  }
}
