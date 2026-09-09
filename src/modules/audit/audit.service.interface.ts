import { PoolClient } from 'pg';
import { AuditLog, CreateAuditLogInput } from './audit.model';

export interface IAuditService {
  record(input: CreateAuditLogInput, client?: PoolClient): Promise<AuditLog>;
  getById(id: string): Promise<AuditLog>;
}
