import type { PoolClient } from 'pg';
import { AuditRecord } from './audit.model';

export interface IAuditRepository {
  create(record: Omit<AuditRecord, 'id' | 'createdAt'>, client?: PoolClient): Promise<AuditRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  findByPerformer(performedBy: string, limit?: number): Promise<AuditRecord[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditRecord[]>;
}
