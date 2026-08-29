import type { PoolClient } from 'pg';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'SUBMIT';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  performedBy: string | null;
  performedAt: Date;
}

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  performedBy?: string | null;
}

export interface IAuditLogRepository {
  create(log: AuditLog, client?: PoolClient): Promise<AuditLog>;
  findById(id: string, client?: PoolClient): Promise<AuditLog | null>;
  findByEntity(
    entityType: string,
    entityId: string,
    client?: PoolClient
  ): Promise<AuditLog[]>;
}

export interface IAuditService {
  record(input: AuditLogInput, client?: PoolClient): Promise<AuditLog>;
}
