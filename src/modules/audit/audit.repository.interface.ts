import { PoolClient } from 'pg';
import { AuditLog, CreateAuditLogInput } from './audit.model';

export interface IAuditRepository {
  create(input: CreateAuditLogInput, client?: PoolClient): Promise<AuditLog>;
  findById(id: string, client?: PoolClient): Promise<AuditLog | null>;
}
