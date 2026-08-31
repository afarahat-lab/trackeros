import { PoolClient } from 'pg';
import { EntityType, AuditAction } from '../../shared/types';
import { AuditLog, AuditLogQuery } from './audit.model';

export type AuditRecordInput = Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>;

export interface IAuditService {
  record(input: AuditRecordInput): Promise<AuditLog>;
  findByEntity(entityType: EntityType, entityId: string): Promise<AuditLog[]>;
  findByPerformedAt(from: Date, to: Date): Promise<AuditLog[]>;
  query(query: AuditLogQuery, client?: PoolClient): Promise<AuditLog[]>;
}
