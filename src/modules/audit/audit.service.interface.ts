import type { PoolClient } from 'pg';

import type { AuditLog, AuditLogInput } from './audit.model';

export interface IAuditService {
  record(entry: AuditLogInput, client?: PoolClient): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByActor(performedBy: string): Promise<AuditLog[]>;
  findByTimeRange(from: Date, to: Date): Promise<AuditLog[]>;
}
