import { PoolClient } from 'pg';
import { AuditRecord } from './audit.model';

export interface IAuditRepository {
  insert(record: Omit<AuditRecord, 'id' | 'createdAt'>, client?: PoolClient): Promise<AuditRecord>;
}
